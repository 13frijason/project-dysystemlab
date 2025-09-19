const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 백그라운드 자동 복구 시도 - 비활성화됨
async function attemptBackgroundRecovery() {
  console.log('Background recovery disabled');
  // 자동복구 기능이 비활성화됨
  return;
}

// 백업 파일에서 시공사진 데이터 가져오기
async function getConstructionFromBackup(page, perPage) {
  try {
    console.log('Fetching construction from backup files...');
    
    const constructionDir = path.join(process.cwd(), 'content', 'construction');
    
    if (!fs.existsSync(constructionDir)) {
      console.log('No construction backup directory found');
      return { construction: [], total: 0 };
    }
    
    const files = fs.readdirSync(constructionDir).filter(file => file.endsWith('.json'));
    
    const allConstruction = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(constructionDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // 활성 상태인 데이터만 추가
        if (data.status === '활성') {
          allConstruction.push(data);
        }
      } catch (fileError) {
        console.warn(`Failed to read construction backup file ${file}:`, fileError.message);
      }
    }
    
    // 생성일 기준으로 정렬 (최신순)
    allConstruction.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const total = allConstruction.length;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    
    const paginatedConstruction = allConstruction.slice(from, to + 1);
    
    console.log(`Found ${total} construction posts from backup files, returning ${paginatedConstruction.length} for page ${page}`);
    
    return {
      construction: paginatedConstruction,
      total: total
    };
    
  } catch (error) {
    console.error('Error reading construction backup files:', error);
    return { construction: [], total: 0 };
  }
}

exports.handler = async (event, context) => {
  console.log('get-construction function called');
  console.log('HTTP method:', event.httpMethod);
  console.log('Query parameters:', event.queryStringParameters);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // GET 요청만 허용
  if (event.httpMethod !== 'GET') {
    console.log('Invalid method:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 페이지네이션 파라미터
    const page = parseInt(event.queryStringParameters?.page) || 1;
    const perPage = parseInt(event.queryStringParameters?.per_page) || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    console.log(`Fetching construction: page ${page}, perPage ${perPage}, from ${from}, to ${to}`);

    // Supabase에서 데이터 가져오기 (모든 활성 상태 데이터)
    console.log('Fetching from Supabase...');
    const { data: construction, error, count } = await supabase
      .from('construction')
      .select('*', { count: 'exact' })
      .eq('status', '활성')
      .order('created_at', { ascending: false })
      .range(from, to);

    let finalConstruction = [];
    let finalTotal = 0;
    let dataSource = 'supabase';

    if (error) {
      console.error('Supabase error:', error);
      console.log('Supabase 실패, 백업 파일에서 데이터 가져오기...');
      
      // Supabase 실패 시 백업 파일에서 데이터 가져오기
      const backupData = await getConstructionFromBackup(page, perPage);
      finalConstruction = backupData.construction;
      finalTotal = backupData.total;
      dataSource = 'backup';
      
      console.log(`Found ${finalConstruction.length} construction posts from backup files, total count: ${finalTotal}`);
      
      // 백그라운드에서 자동 복구 시도 (비동기, 응답에 영향 없음)
      setTimeout(async () => {
        try {
          console.log('Attempting background recovery...');
          await attemptBackgroundRecovery();
        } catch (recoveryError) {
          console.warn('Background recovery failed:', recoveryError.message);
        }
      }, 100);
      
    } else {
      finalConstruction = construction || [];
      finalTotal = count || 0;
      console.log(`Found ${finalConstruction.length} construction posts from Supabase, total count: ${finalTotal}`);
    }

    const totalPages = Math.ceil(finalTotal / perPage);
    const hasMore = page < totalPages;

    console.log(`Pagination: page ${page}, perPage ${perPage}, total ${finalTotal}, totalPages ${totalPages}, dataSource: ${dataSource}`);

    // 캐시 방지 헤더 설정
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        construction: finalConstruction,
        total: finalTotal,
        page: page,
        per_page: perPage,
        total_pages: totalPages,
        has_more: hasMore,
        data_source: dataSource,
        message: dataSource === 'backup' ? '백업 파일에서 데이터를 가져왔습니다.' : '정상적으로 데이터를 가져왔습니다.'
      })
    };

  } catch (error) {
    console.error('Error in get-construction:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: '서버 오류가 발생했습니다.',
        details: error.message 
      })
    };
  }
}; 