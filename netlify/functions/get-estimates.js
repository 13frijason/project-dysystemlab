const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 백그라운드 자동 복구 시도
async function attemptBackgroundRecovery() {
  try {
    // 자동 복구 함수 호출
    const recoveryResponse = await fetch('/.netlify/functions/auto-recovery', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-recovery-key': process.env.RECOVERY_API_KEY || 'auto-recovery-key-2024'
      }
    });
    
    if (recoveryResponse.ok) {
      const result = await recoveryResponse.json();
      if (result.success && result.recovery_result) {
        console.log(`Background recovery successful: ${result.recovery_result.total_recovered} items recovered`);
      }
    }
  } catch (error) {
    console.warn('Background recovery attempt failed:', error.message);
  }
}

// 백업 파일에서 견적문의 데이터 가져오기
async function getEstimatesFromBackup(page, perPage, isAdmin) {
  try {
    console.log('Fetching estimates from backup files...');
    
    const estimatesDir = path.join(process.cwd(), 'content', 'estimates');
    
    if (!fs.existsSync(estimatesDir)) {
      console.log('No estimates backup directory found');
      return { estimates: [], total: 0 };
    }
    
    const files = fs.readdirSync(estimatesDir).filter(file => file.endsWith('.json'));
    
    const allEstimates = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(estimatesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // 활성 상태인 데이터만 추가
        if (data.status === '대기중' || data.status === '완료') {
          allEstimates.push(data);
        }
      } catch (fileError) {
        console.warn(`Failed to read estimate backup file ${file}:`, fileError.message);
      }
    }
    
    // 생성일 기준으로 정렬 (최신순)
    allEstimates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const total = allEstimates.length;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    
    const paginatedEstimates = allEstimates.slice(from, to + 1);
    
    // 개인정보 마스킹 (관리자가 아닌 경우)
    if (!isAdmin) {
      paginatedEstimates.forEach(estimate => {
        estimate.name = maskName(estimate.name);
        estimate.phone = maskPhone(estimate.phone);
      });
    }
    
    console.log(`Found ${total} estimates from backup files, returning ${paginatedEstimates.length} for page ${page}`);
    
    return {
      estimates: paginatedEstimates,
      total: total
    };
    
  } catch (error) {
    console.error('Error reading estimates backup files:', error);
    return { estimates: [], total: 0 };
  }
}

exports.handler = async (event, context) => {
  console.log('get-estimates function called');
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

    console.log(`Fetching estimates: page ${page}, perPage ${perPage}, from ${from}, to ${to}`);

    // 개인정보 마스킹 확인 (관리자가 아닌 경우)
    const isAdmin = event.headers.authorization && event.headers.authorization.includes('Bearer');

    // Supabase에서 데이터 가져오기 (모든 데이터, 만료되지 않은 것만)
    console.log('Fetching from Supabase...');
    const { data: estimates, error, count } = await supabase
      .from('estimates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    let finalEstimates = [];
    let finalTotal = 0;
    let dataSource = 'supabase';

    if (error) {
      console.error('Supabase error:', error);
      console.log('Supabase 실패, 백업 파일에서 데이터 가져오기...');
      
      // Supabase 실패 시 백업 파일에서 데이터 가져오기
      const backupData = await getEstimatesFromBackup(page, perPage, isAdmin);
      finalEstimates = backupData.estimates;
      finalTotal = backupData.total;
      dataSource = 'backup';
      
      console.log(`Found ${finalEstimates.length} estimates from backup files, total count: ${finalTotal}`);
      
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
      finalEstimates = estimates || [];
      finalTotal = count || 0;
      
      // 개인정보 마스킹 (관리자가 아닌 경우)
      if (!isAdmin) {
        finalEstimates.forEach(estimate => {
          estimate.name = maskName(estimate.name);
          estimate.phone = maskPhone(estimate.phone);
        });
      }
      
      console.log(`Found ${finalEstimates.length} estimates from Supabase, total count: ${finalTotal}`);
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
        estimates: finalEstimates,
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
    console.error('Error in get-estimates:', error);
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

// 이름 마스킹 함수
function maskName(name) {
  if (!name) return '';
  if (name.length <= 2) return name.charAt(0) + '*';
  return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
}

// 전화번호 마스킹 함수
function maskPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 4) return phone;
  return cleaned.substring(0, 4) + '-****-' + cleaned.substring(cleaned.length - 4);
} 