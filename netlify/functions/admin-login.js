const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

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
    
    // 필수 필드 검증
    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '아이디와 비밀번호를 입력해주세요.' })
      };
    }

    // 데이터베이스에서 관리자 정보 조회
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !admin) {
      console.log('Admin not found');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
      };
    }

    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValidPassword) {
      console.log('Invalid password');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
      };
    }

    console.log('Login successful for admin:', username);

    // 성공 응답
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '로그인 성공',
        admin: {
          id: admin.id,
          username: admin.username
        }
      })
    };

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