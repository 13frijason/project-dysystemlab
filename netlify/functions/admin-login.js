const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  console.log('Admin login function called');
  
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리 (CORS preflight)
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
    console.log('Parsing request body...');
    const { username, password } = JSON.parse(event.body);
    
    console.log('Login attempt for username:', username);
    console.log('Password provided:', password);
    
    // 필수 필드 검증
    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '아이디와 비밀번호를 입력해주세요.' })
      };
    }

    // 임시 하드코딩된 인증 (테스트용)
    if (username === 'admin' && password === 'rlatjsgh1!') {
      console.log('Login successful for admin:', username);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '로그인 성공',
          admin: {
            id: 1,
            username: 'admin'
          }
        })
      };
    } else {
      console.log('Invalid credentials');
      console.log('Expected: admin / rlatjsgh1!');
      console.log('Received:', username, '/', password);
      
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
      };
    }

  } catch (error) {
    console.error('Login error:', error);
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