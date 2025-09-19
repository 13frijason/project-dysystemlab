const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  console.log('auto-recovery function called - DISABLED');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // 자동복구 기능이 비활성화됨
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: false,
      message: '자동복구 기능이 비활성화되었습니다.',
      disabled: true
    })
  };
};

// Supabase 상태 체크 및 자동 복구
async function checkAndRecover(headers) {
  try {
    console.log('Checking Supabase status...');
    
    // Supabase 연결 테스트
    const { data, error } = await supabase
      .from('estimates')
      .select('id')
      .limit(1);

    if (error) {
      console.log('Supabase is still down or paused');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Supabase가 아직 일시중지 상태입니다.',
          supabase_status: 'paused',
          recovery_needed: true
        })
      };
    }

    console.log('Supabase is active, checking for recovery needed...');

    // Supabase가 활성화되었으므로 복구가 필요한지 확인
    const recoveryResult = await performRecovery();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Supabase가 활성화되었습니다.',
        supabase_status: 'active',
        recovery_result: recoveryResult
      })
    };

  } catch (error) {
    console.error('Error checking Supabase status:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Supabase 상태 확인 중 오류가 발생했습니다.',
        supabase_status: 'unknown',
        error: error.message
      })
    };
  }
}

// 실제 복구 수행
async function performRecovery() {
  try {
    console.log('Starting automatic recovery...');
    
    let estimatesRecovered = 0;
    let constructionRecovered = 0;
    let estimatesErrors = 0;
    let constructionErrors = 0;

    // 견적문의 복구
    const estimatesResult = await recoverEstimates();
    estimatesRecovered = estimatesResult.recovered;
    estimatesErrors = estimatesResult.errors;

    // 시공사진 복구
    const constructionResult = await recoverConstruction();
    constructionRecovered = constructionResult.recovered;
    constructionErrors = constructionResult.errors;

    console.log(`Recovery completed: ${estimatesRecovered} estimates, ${constructionRecovered} construction posts recovered`);

    return {
      estimates_recovered: estimatesRecovered,
      construction_recovered: constructionRecovered,
      estimates_errors: estimatesErrors,
      construction_errors: constructionErrors,
      total_recovered: estimatesRecovered + constructionRecovered,
      total_errors: estimatesErrors + constructionErrors
    };

  } catch (error) {
    console.error('Error during recovery:', error);
    return {
      error: error.message
    };
  }
}

// 견적문의 복구
async function recoverEstimates() {
  try {
    console.log('Recovering estimates...');
    
    const estimatesDir = path.join(process.cwd(), 'content', 'estimates');
    
    if (!fs.existsSync(estimatesDir)) {
      return { recovered: 0, errors: 0 };
    }
    
    const files = fs.readdirSync(estimatesDir).filter(file => file.endsWith('.json'));
    
    let recovered = 0;
    let errors = 0;
    
    for (const file of files) {
      try {
        const filePath = path.join(estimatesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // Supabase에 데이터 삽입 (upsert 사용으로 중복 방지)
        const { error: insertError } = await supabase
          .from('estimates')
          .upsert([{
            id: parseInt(data.id),
            title: data.title,
            name: data.name,
            phone: data.phone,
            service_type: data.service_type,
            content: data.content,
            status: data.status || '대기중',
            ip_address: data.ip_address,
            user_agent: data.user_agent,
            created_at: data.created_at,
            updated_at: data.updated_at
          }], { onConflict: 'id' });
        
        if (insertError) {
          console.error(`Failed to recover estimate ${file}:`, insertError);
          errors++;
        } else {
          console.log(`Successfully recovered estimate ${file}`);
          recovered++;
        }
        
      } catch (fileError) {
        console.error(`Error processing estimate ${file}:`, fileError);
        errors++;
      }
    }
    
    return { recovered, errors };
    
  } catch (error) {
    console.error('Error recovering estimates:', error);
    return { recovered: 0, errors: 1 };
  }
}

// 시공사진 복구
async function recoverConstruction() {
  try {
    console.log('Recovering construction...');
    
    const constructionDir = path.join(process.cwd(), 'content', 'construction');
    
    if (!fs.existsSync(constructionDir)) {
      return { recovered: 0, errors: 0 };
    }
    
    const files = fs.readdirSync(constructionDir).filter(file => file.endsWith('.json'));
    
    let recovered = 0;
    let errors = 0;
    
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
          console.error(`Failed to recover construction ${file}:`, insertError);
          errors++;
        } else {
          console.log(`Successfully recovered construction ${file}`);
          recovered++;
        }
        
      } catch (fileError) {
        console.error(`Error processing construction ${file}:`, fileError);
        errors++;
      }
    }
    
    return { recovered, errors };
    
  } catch (error) {
    console.error('Error recovering construction:', error);
    return { recovered: 0, errors: 1 };
  }
}

// 수동 복구 실행
async function manualRecovery(event, headers) {
  try {
    console.log('Manual recovery requested...');
    
    const recoveryResult = await performRecovery();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '수동 복구가 완료되었습니다.',
        recovery_result: recoveryResult
      })
    };
    
  } catch (error) {
    console.error('Manual recovery error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '수동 복구 중 오류가 발생했습니다.',
        details: error.message
      })
    };
  }
}
