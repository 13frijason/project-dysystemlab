const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  console.log('auto-save-to-file function called');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
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
    if (event.httpMethod === 'POST') {
      // 새로운 견적문의를 파일로 자동 저장
      return await saveEstimateToFile(event, headers);
    } else if (event.httpMethod === 'GET') {
      // 저장된 파일 목록 조회
      return await getSavedFiles(headers);
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Auto save to file error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '파일 저장 중 오류가 발생했습니다.',
        details: error.message
      })
    };
  }
};

// 견적문의를 파일로 저장
async function saveEstimateToFile(event, headers) {
  try {
    const data = JSON.parse(event.body);
    
    // 견적문의 데이터 검증
    if (!data.name || !data.phone || !data.service_type || !data.content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '필수 필드가 누락되었습니다.' })
      };
    }

    // 고유 ID 생성 (타임스탬프 기반)
    const id = Date.now().toString();
    const timestamp = new Date().toISOString();
    
    const estimateData = {
      id: id,
      title: `${data.service_type} 견적문의`,
      name: data.name,
      phone: data.phone,
      service_type: data.service_type,
      content: data.content,
      status: '대기중',
      created_at: timestamp,
      updated_at: timestamp
    };

    // content/estimates 디렉토리 생성 (존재하지 않는 경우)
    const estimatesDir = path.join(process.cwd(), 'content', 'estimates');
    if (!fs.existsSync(estimatesDir)) {
      fs.mkdirSync(estimatesDir, { recursive: true });
    }

    // JSON 파일로 저장
    const filePath = path.join(estimatesDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(estimateData, null, 2), 'utf8');

    console.log(`Estimate saved to file: ${filePath}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '견적문의가 파일로 저장되었습니다.',
        id: id,
        file_path: filePath
      })
    };

  } catch (error) {
    console.error('Error saving estimate to file:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '견적문의 저장 중 오류가 발생했습니다.',
        details: error.message
      })
    };
  }
}

// 저장된 파일 목록 조회
async function getSavedFiles(headers) {
  try {
    const estimatesDir = path.join(process.cwd(), 'content', 'estimates');
    
    if (!fs.existsSync(estimatesDir)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '저장된 파일이 없습니다.',
          count: 0,
          files: []
        })
      };
    }

    const files = fs.readdirSync(estimatesDir).filter(file => file.endsWith('.json'));
    
    const fileList = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(estimatesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        fileList.push({
          filename: file,
          id: data.id,
          title: data.title,
          name: data.name,
          created_at: data.created_at
        });
      } catch (fileError) {
        console.warn(`Failed to read ${file}:`, fileError.message);
      }
    }

    console.log(`Found ${fileList.length} saved files`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '저장된 파일 목록을 성공적으로 조회했습니다.',
        count: fileList.length,
        files: fileList
      })
    };

  } catch (error) {
    console.error('Error getting saved files:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '저장된 파일 목록을 가져오는데 실패했습니다.',
        details: error.message
      })
    };
  }
}
