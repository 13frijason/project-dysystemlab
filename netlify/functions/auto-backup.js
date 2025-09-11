const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  console.log('auto-backup function called');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POST 요청만 허용 (스케줄러에서 호출)
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 인증 확인 (API 키 또는 특별한 헤더)
    const authHeader = event.headers['x-backup-key'];
    const expectedKey = process.env.BACKUP_API_KEY || 'auto-backup-key-2024';
    
    if (authHeader !== expectedKey) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // 견적문의 데이터 백업
    const { data: estimates, error: estimatesError } = await supabase
      .from('estimates')
      .select('*')
      .order('created_at', { ascending: false });

    if (estimatesError) {
      throw new Error(`견적문의 백업 실패: ${estimatesError.message}`);
    }

    // 시공사진 데이터 백업
    const { data: construction, error: constructionError } = await supabase
      .from('construction')
      .select('*')
      .order('created_at', { ascending: false });

    if (constructionError) {
      throw new Error(`시공사진 백업 실패: ${constructionError.message}`);
    }

    const backupData = {
      timestamp: new Date().toISOString(),
      estimates: estimates || [],
      construction: construction || [],
      total_estimates: estimates ? estimates.length : 0,
      total_construction: construction ? construction.length : 0,
      backup_type: 'auto'
    };

    // 백업 데이터를 Supabase의 백업 테이블에 저장
    const { error: backupError } = await supabase
      .from('data_backups')
      .insert([{
        backup_data: backupData,
        backup_type: 'auto',
        created_at: new Date().toISOString()
      }]);

    if (backupError) {
      console.warn('백업 테이블 저장 실패:', backupError.message);
      // 백업 테이블이 없어도 계속 진행
    }

    console.log(`Auto backup completed: ${backupData.total_estimates} estimates, ${backupData.total_construction} construction posts`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '자동 백업이 완료되었습니다.',
        data: backupData
      })
    };

  } catch (error) {
    console.error('Auto backup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '자동 백업 중 오류가 발생했습니다.',
        details: error.message
      })
    };
  }
};
