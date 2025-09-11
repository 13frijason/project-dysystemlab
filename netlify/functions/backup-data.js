const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  console.log('backup-data function called');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // 견적문의 데이터 백업
    const { data: estimates, error: estimatesError } = await supabase
      .from('estimates')
      .select('*')
      .order('created_at', { ascending: false });

    if (estimatesError) {
      throw new Error(`견적문의 백업 실패: ${estimatesError.message}`);
    }

    // 시공사진 데이터 백업
    const { data: construction, error: constructionError } = await supabase
      .from('construction')
      .select('*')
      .order('created_at', { ascending: false });

    if (constructionError) {
      throw new Error(`시공사진 백업 실패: ${constructionError.message}`);
    }

    const backupData = {
      timestamp: new Date().toISOString(),
      estimates: estimates || [],
      construction: construction || [],
      total_estimates: estimates ? estimates.length : 0,
      total_construction: construction ? construction.length : 0
    };

    console.log(`Backup completed: ${backupData.total_estimates} estimates, ${backupData.total_construction} construction posts`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '데이터 백업이 완료되었습니다.',
        data: backupData
      })
    };

  } catch (error) {
    console.error('Backup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '백업 중 오류가 발생했습니다.',
        details: error.message
      })
    };
  }
};
