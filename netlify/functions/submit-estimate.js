const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  console.log('Function started:', event.httpMethod);
  console.log('Event body:', event.body);
  
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    console.log('Invalid method:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Parsing request body...');
    const data = JSON.parse(event.body);
    console.log('Parsed data:', data);
    
    // 필수 필드 검증
    if (!data.name || !data.phone || !data.service_type || !data.content) {
      console.log('Missing required fields:', { name: !!data.name, phone: !!data.phone, service_type: !!data.service_type, content: !!data.content });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '모든 필드를 입력해주세요.' })
      };
    }

    // 견적문의 데이터 생성
    const estimate = {
      id: Date.now().toString(),
      title: `${data.service_type} 견적문의`,
      name: data.name,
      phone: data.phone,
      service_type: data.service_type,
      content: data.content,
      status: '대기중',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // 메타데이터 추가
      ip_address: event.headers['client-ip'] || 'unknown',
      user_agent: event.headers['user-agent'] || 'unknown'
    };

    console.log('Created estimate object:', estimate);

    // 데이터를 JSON 파일로 저장
    const dataDir = path.join(process.cwd(), 'content', 'estimates');
    const filePath = path.join(dataDir, `${estimate.id}.json`);
    
    console.log('Data directory:', dataDir);
    console.log('File path:', filePath);
    
    // 디렉토리가 없으면 생성
    try {
      console.log('Creating directory...');
      await fs.mkdir(dataDir, { recursive: true });
      console.log('Directory created successfully');
    } catch (err) {
      console.log('Directory creation error (might already exist):', err.message);
    }

    // 파일에 데이터 저장
    console.log('Writing file...');
    await fs.writeFile(filePath, JSON.stringify(estimate, null, 2));
    console.log('File written successfully');

    // 성공 응답
    console.log('Sending success response');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: '견적문의가 성공적으로 접수되었습니다.',
        id: estimate.id,
        estimated_response_time: '24시간 이내'
      })
    };

  } catch (error) {
    console.error('Detailed error:', error);
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