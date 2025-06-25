const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

    let estimates = [];
    let totalCount = 0;

    // 먼저 Supabase에서 데이터 가져오기 시도
    try {
      console.log('Attempting to fetch from Supabase...');
      const { data: supabaseEstimates, error, count } = await supabase
        .from('estimates')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (!error && supabaseEstimates) {
        console.log(`Found ${supabaseEstimates.length} estimates from Supabase`);
        estimates = supabaseEstimates;
        totalCount = count || 0;
      } else {
        console.log('Supabase fetch failed, trying file system...');
        throw new Error('Supabase fetch failed');
      }
    } catch (supabaseError) {
      console.log('Supabase error, falling back to file system:', supabaseError.message);
      
      // 파일 시스템에서 데이터 가져오기
      const estimatesDir = path.join(process.cwd(), 'content', 'estimates');
      
      if (fs.existsSync(estimatesDir)) {
        const files = fs.readdirSync(estimatesDir)
          .filter(file => file.endsWith('.json'))
          .sort((a, b) => {
            // 파일명을 기준으로 내림차순 정렬 (최신 파일이 먼저)
            const aTime = fs.statSync(path.join(estimatesDir, a)).mtime.getTime();
            const bTime = fs.statSync(path.join(estimatesDir, b)).mtime.getTime();
            return bTime - aTime;
          });

        console.log(`Found ${files.length} estimate files`);

        // 전체 파일 수
        totalCount = files.length;

        // 페이지네이션 적용
        const startIndex = from;
        const endIndex = Math.min(to + 1, files.length);
        const pageFiles = files.slice(startIndex, endIndex);

        estimates = pageFiles.map(filename => {
          const filePath = path.join(estimatesDir, filename);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const estimate = JSON.parse(fileContent);
          
          // 파일명을 ID로 사용 (확장자 포함)
          estimate.id = filename;
          
          console.log(`Loaded estimate from file: ${filename}, ID: ${estimate.id}`);
          
          return estimate;
        });

        console.log(`Loaded ${estimates.length} estimates from file system`);
      }
    }

    // 개인정보 마스킹 (관리자가 아닌 경우)
    const isAdmin = event.headers.authorization && event.headers.authorization.includes('Bearer');
    
    if (!isAdmin) {
      estimates.forEach(estimate => {
        estimate.name = maskName(estimate.name);
        estimate.phone = maskPhone(estimate.phone);
      });
    }

    const totalPages = Math.ceil((totalCount || 0) / perPage);
    const hasMore = page < totalPages;

    console.log(`Pagination: page ${page}, perPage ${perPage}, total ${totalCount}, totalPages ${totalPages}`);

    // 캐시 헤더 추가 (5분 캐시)
    headers['Cache-Control'] = 'public, max-age=300';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        estimates: estimates || [],
        total: totalCount || 0,
        page: page,
        per_page: perPage,
        total_pages: totalPages,
        has_more: hasMore
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