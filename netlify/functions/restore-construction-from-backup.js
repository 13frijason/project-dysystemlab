const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  console.log('restore-construction-from-backup function called');
  
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
    // 인증 확인 (관리자만 실행 가능)
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.includes('Bearer')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '인증이 필요합니다.' })
      };
    }

    if (event.httpMethod === 'GET') {
      // 시공사진 백업 파일 목록 조회
      return await getConstructionBackupFiles(headers);
    } else if (event.httpMethod === 'POST') {
      // 시공사진 백업 데이터 복구
      return await restoreConstructionFromBackup(event, headers);
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Restore construction from backup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '시공사진 복구 중 오류가 발생했습니다.',
        details: error.message
      })
    };
  }
};

// 시공사진 백업 파일 목록 조회
async function getConstructionBackupFiles(headers) {
  try {
    console.log('Reading construction backup files...');
    
    // content/construction 폴더의 파일들 읽기
    const constructionDir = path.join(process.cwd(), 'content', 'construction');
    
    if (!fs.existsSync(constructionDir)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '시공사진 백업 파일이 없습니다.',
          count: 0,
          data: []
        })
      };
    }
    
    const files = fs.readdirSync(constructionDir).filter(file => file.endsWith('.json'));
    
    const backupData = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(constructionDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        backupData.push(data);
      } catch (fileError) {
        console.warn(`Failed to read ${file}:`, fileError.message);
      }
    }
    
    console.log(`Found ${backupData.length} construction backup files`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '시공사진 백업 파일을 성공적으로 조회했습니다.',
        count: backupData.length,
        data: backupData
      })
    };
    
  } catch (error) {
    console.error('Error reading construction backup files:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '시공사진 백업 파일을 읽는데 실패했습니다.',
        details: error.message
      })
    };
  }
}

// 시공사진 백업 데이터 복구
async function restoreConstructionFromBackup(event, headers) {
  try {
    console.log('Starting construction data restoration...');
    
    // content/construction 폴더의 모든 JSON 파일 읽기
    const constructionDir = path.join(process.cwd(), 'content', 'construction');
    
    if (!fs.existsSync(constructionDir)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '복구할 시공사진 백업 파일이 없습니다.',
          restored_count: 0,
          error_count: 0
        })
      };
    }
    
    const files = fs.readdirSync(constructionDir).filter(file => file.endsWith('.json'));
    
    const restoredData = [];
    const errors = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(constructionDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // Supabase에 데이터 삽입 (upsert 사용으로 중복 방지)
        const { error: insertError } = await supabase
          .from('construction')
          .upsert([{
            id: parseInt(data.id),
            title: data.title,
            date: data.date,
            description: data.description,
            image_data: data.image_data,
            image_name: data.image_name,
            status: data.status || '활성',
            ip_address: data.ip_address,
            user_agent: data.user_agent,
            created_at: data.created_at,
            updated_at: data.updated_at
          }], { onConflict: 'id' });
        
        if (insertError) {
          console.error(`Failed to restore construction ${file}:`, insertError);
          errors.push({ file, error: insertError.message });
        } else {
          console.log(`Successfully restored construction ${file}`);
          restoredData.push(data);
        }
        
      } catch (fileError) {
        console.error(`Error processing construction ${file}:`, fileError);
        errors.push({ file, error: fileError.message });
      }
    }
    
    console.log(`Construction restoration completed: ${restoredData.length} restored, ${errors.length} errors`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '시공사진 복구가 완료되었습니다.',
        restored_count: restoredData.length,
        error_count: errors.length,
        restored_data: restoredData,
        errors: errors
      })
    };
    
  } catch (error) {
    console.error('Error during construction restoration:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '시공사진 복구 중 오류가 발생했습니다.',
        details: error.message
      })
    };
  }
}
