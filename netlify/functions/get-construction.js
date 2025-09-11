const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`데이터베이스 조회 실패: ${error.message}`);
    }

    console.log(`Found ${construction.length} construction posts from Supabase, total count: ${count}`);

    const totalPages = Math.ceil((count || 0) / perPage);
    const hasMore = page < totalPages;

    console.log(`Pagination: page ${page}, perPage ${perPage}, total ${count}, totalPages ${totalPages}`);

    // 캐시 방지 헤더 설정
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        construction: construction || [],
        total: count || 0,
        page: page,
        per_page: perPage,
        total_pages: totalPages,
        has_more: hasMore
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