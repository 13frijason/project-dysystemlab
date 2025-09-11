const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 파일로 백업 저장 함수
async function saveToBackupFile(data) {
  try {
    // 고유 ID 생성 (타임스탬프 기반)
    const id = data.id || Date.now().toString();
    const timestamp = new Date().toISOString();
    
    const estimateData = {
      id: id,
      title: `${data.service_type} 견적문의`,
      name: data.name,
      phone: data.phone,
      service_type: data.service_type,
      content: data.content,
      status: '대기중',
      ip_address: data.ip_address || 'unknown',
      user_agent: data.user_agent || 'unknown',
      created_at: data.created_at || timestamp,
      updated_at: data.updated_at || timestamp
    };

    // content/estimates 디렉토리 생성 (존재하지 않는 경우)
    const estimatesDir = path.join(process.cwd(), 'content', 'estimates');
    if (!fs.existsSync(estimatesDir)) {
      fs.mkdirSync(estimatesDir, { recursive: true });
    }

    // JSON 파일로 저장
    const filePath = path.join(estimatesDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(estimateData, null, 2), 'utf8');

    console.log(`Estimate backed up to file: ${filePath}`);

    return {
      success: true,
      id: id,
      file_path: filePath
    };

  } catch (error) {
    console.error('Error saving backup file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

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

    // Supabase에 데이터 저장
    const { data: estimate, error } = await supabase
      .from('estimates')
      .insert([
        {
          title: `${data.service_type} 견적문의`,
          name: data.name,
          phone: data.phone,
          service_type: data.service_type,
          content: data.content,
          status: '대기중',
          ip_address: event.headers['client-ip'] || 'unknown',
          user_agent: event.headers['user-agent'] || 'unknown'
        }
      ])
      .select()
      .single();

    // Supabase 저장 실패해도 파일로 백업
    if (error) {
      console.error('Supabase error:', error);
      console.log('Supabase 저장 실패, 파일로 백업 시도...');
      
      // 파일로 백업 저장 시도
      try {
        const backupData = {
          ...data,
          ip_address: event.headers['client-ip'] || 'unknown',
          user_agent: event.headers['user-agent'] || 'unknown'
        };
        
        // 자체 백업 함수 호출
        const backupResult = await saveToBackupFile(backupData);
        
        if (backupResult.success) {
          console.log('백업 파일 저장 성공:', backupResult);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true, 
              message: '견적문의가 백업 파일로 저장되었습니다. (Supabase 일시중지)',
              id: backupResult.id,
              backup: true,
              estimated_response_time: '24시간 이내'
            })
          };
        }
      } catch (backupError) {
        console.error('백업 파일 저장도 실패:', backupError);
      }
      
      throw new Error(`데이터베이스 저장 실패: ${error.message}`);
    }

    console.log('Successfully saved to Supabase:', estimate);
    
    // Supabase 저장 성공 시에도 백업 파일로 저장 (이중 보안)
    try {
      const backupData = {
        ...data,
        id: estimate.id,
        created_at: estimate.created_at,
        updated_at: estimate.updated_at
      };
      await saveToBackupFile(backupData);
      console.log('백업 파일도 저장 완료');
    } catch (backupError) {
      console.warn('백업 파일 저장 실패 (무시):', backupError.message);
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