const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  console.log('restore-data function called');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    if (!data.estimates || !data.construction) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '백업 데이터가 올바르지 않습니다.' })
      };
    }

    let restoredEstimates = 0;
    let restoredConstruction = 0;

    // 견적문의 데이터 복원
    if (data.estimates.length > 0) {
      const { error: estimatesError } = await supabase
        .from('estimates')
        .upsert(data.estimates, { onConflict: 'id' });

      if (estimatesError) {
        throw new Error(`견적문의 복원 실패: ${estimatesError.message}`);
      }
      restoredEstimates = data.estimates.length;
    }

    // 시공사진 데이터 복원
    if (data.construction.length > 0) {
      const { error: constructionError } = await supabase
        .from('construction')
        .upsert(data.construction, { onConflict: 'id' });

      if (constructionError) {
        throw new Error(`시공사진 복원 실패: ${constructionError.message}`);
      }
      restoredConstruction = data.construction.length;
    }

    console.log(`Restore completed: ${restoredEstimates} estimates, ${restoredConstruction} construction posts`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '데이터 복원이 완료되었습니다.',
        restored_estimates: restoredEstimates,
        restored_construction: restoredConstruction
      })
    };

  } catch (error) {
    console.error('Restore error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '복원 중 오류가 발생했습니다.',
        details: error.message
      })
    };
  }
};
