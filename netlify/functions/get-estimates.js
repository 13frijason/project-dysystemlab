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

    // Supabase에서 데이터 가져오기
    console.log('Fetching from Supabase...');
    const { data: estimates, error, count } = await supabase
      .from('estimates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`데이터베이스 조회 실패: ${error.message}`);
    }

    console.log(`Found ${estimates.length} estimates from Supabase, total count: ${count}`);

    // 개인정보 마스킹 (관리자가 아닌 경우)
    const isAdmin = event.headers.authorization && event.headers.authorization.includes('Bearer');
    
    if (!isAdmin) {
      estimates.forEach(estimate => {
        estimate.name = maskName(estimate.name);
        estimate.phone = maskPhone(estimate.phone);
      });
    }

    const totalPages = Math.ceil((count || 0) / perPage);
    const hasMore = page < totalPages;

    console.log(`Pagination: page ${page}, perPage ${perPage}, total ${count}, totalPages ${totalPages}`);

    // 캐시 헤더 추가 (5분 캐시)
    headers['Cache-Control'] = 'public, max-age=300';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        estimates: estimates || [],
        total: count || 0,
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