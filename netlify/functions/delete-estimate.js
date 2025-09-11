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
    console.log('ID type:', typeof id);
    console.log('ID length:', id.length);
    
    if (!id) {
      console.log('No ID provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '견적문의 ID가 필요합니다.' })
      };
    }

    // 인증 토큰 확인 (선택적)
    const authHeader = event.headers.authorization;
    if (authHeader && authHeader.includes('Bearer')) {
      console.log('Authorization header present, validating token...');
      // 토큰이 있으면 유효성 검사 (실제 구현에서는 JWT 검증)
      // 여기서는 단순히 토큰 존재 여부만 확인
    }

    // Supabase에서 견적문의 삭제 (재시도 로직 포함)
    console.log('Attempting to delete from Supabase...');
    let deleteResult;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        deleteResult = await supabase
          .from('estimates')
          .delete()
          .eq('id', id)
          .select();
        
        if (deleteResult.error && deleteResult.error.code === 'PGRST301') {
          // RLS 정책 오류인 경우 재시도
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`RLS policy error, retrying... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
        break;
      } catch (retryError) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`Delete attempt ${retryCount} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw retryError;
      }
    }
    
    const { data, error, count } = deleteResult;

    console.log('Supabase delete response:', { data, error, count });

    if (error) {
      console.error('Supabase delete error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '견적문의 삭제 중 오류가 발생했습니다.', details: error.message })
      };
    }

    if (!data || data.length === 0) {
      console.log('No rows were deleted from Supabase');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: '삭제할 견적문의를 찾을 수 없습니다.' })
      };
    }

    console.log('Estimate deleted successfully from Supabase:', data);

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