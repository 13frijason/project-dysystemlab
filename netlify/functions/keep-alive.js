const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  console.log('keep-alive function called');
  
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
    // 간단한 쿼리로 프로젝트 상태 확인
    console.log('Checking Supabase project status...');
    
    const { data, error } = await supabase
      .from('estimates')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase connection error:', error);
      
      // 프로젝트가 일시중지된 경우
      if (error.message.includes('suspended') || error.message.includes('paused')) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({
            error: 'Supabase project is paused',
            message: '프로젝트가 일시중지되었습니다. 수동으로 재활성화해주세요.',
            action_required: 'manual_resume',
            supabase_url: supabaseUrl
          })
        };
      }
      
      throw error;
    }

    console.log('Supabase project is active');

    // 프로젝트가 활성 상태인 경우 간단한 통계 반환
    const { data: estimates, error: estimatesError } = await supabase
      .from('estimates')
      .select('id')
      .limit(5);

    const { data: construction, error: constructionError } = await supabase
      .from('construction')
      .select('id')
      .limit(5);

    const stats = {
      timestamp: new Date().toISOString(),
      status: 'active',
      estimates_count: estimates ? estimates.length : 0,
      construction_count: construction ? construction.length : 0,
      message: '프로젝트가 정상적으로 작동 중입니다.'
    };

    console.log('Keep-alive successful:', stats);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(stats)
    };

  } catch (error) {
    console.error('Keep-alive error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Keep-alive failed',
        message: '프로젝트 상태 확인 중 오류가 발생했습니다.',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
