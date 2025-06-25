const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  console.log('delete-estimate function called');
  console.log('HTTP Method:', event.httpMethod);
  console.log('Headers:', event.headers);
  
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // DELETE 요청만 허용
  if (event.httpMethod !== 'DELETE') {
    console.log('Method not allowed:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Parsing request body...');
    console.log('Request body:', event.body);
    const { id } = JSON.parse(event.body);
    
    console.log('Deleting estimate with ID:', id);
    
    if (!id) {
      console.log('No ID provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '견적문의 ID가 필요합니다.' })
      };
    }

    // Supabase에서 견적문의 삭제
    console.log('Attempting to delete from Supabase...');
    const { error } = await supabase
      .from('estimates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '견적문의 삭제 중 오류가 발생했습니다.' })
      };
    }

    console.log('Estimate deleted successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '견적문의가 성공적으로 삭제되었습니다.'
      })
    };

  } catch (error) {
    console.error('Delete estimate error:', error);
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