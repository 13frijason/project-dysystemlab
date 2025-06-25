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

    // 현재 작업 디렉토리 확인
    const cwd = process.cwd();
    console.log('Current working directory:', cwd);
    
    // 데이터를 JSON 파일로 저장 (상대 경로 사용)
    const dataDir = path.join(cwd, 'content', 'estimates');
    const filePath = path.join(dataDir, `${estimate.id}.json`);
    
    console.log('Data directory:', dataDir);
    console.log('File path:', filePath);
    
    // 디렉토리가 없으면 생성
    try {
      console.log('Creating directory...');
      await fs.mkdir(dataDir, { recursive: true });
      console.log('Directory created successfully');
    } catch (err) {
      console.log('Directory creation error:', err.message);
      // 디렉토리 생성 실패 시에도 계속 진행 (이미 존재할 수 있음)
    }

    // 파일에 데이터 저장
    try {
      console.log('Writing file...');
      await fs.writeFile(filePath, JSON.stringify(estimate, null, 2), 'utf8');
      console.log('File written successfully');
    } catch (writeErr) {
      console.error('File write error:', writeErr);
      throw new Error(`파일 저장 실패: ${writeErr.message}`);
    }

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
    
    // JSON 파싱 오류인지 확인
    if (error instanceof SyntaxError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: '잘못된 데이터 형식입니다.',
          details: error.message 
        })
      };
    }
    
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