const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // DELETE 요청만 허용
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // 관리자 권한 확인
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.includes('Bearer')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: '관리자 권한이 필요합니다.' })
    };
  }

  try {
    const { id } = JSON.parse(event.body || '{}');
    
    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '견적문의 ID가 필요합니다.' })
      };
    }

    const dataDir = path.join(process.cwd(), 'content', 'estimates');
    const filePath = path.join(dataDir, `${id}.json`);

    // 파일 존재 확인
    try {
      await fs.access(filePath);
    } catch (err) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: '견적문의를 찾을 수 없습니다.' })
      };
    }

    // 파일 삭제
    await fs.unlink(filePath);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: '견적문의가 삭제되었습니다.' 
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '서버 오류가 발생했습니다.' })
    };
  }
}; 