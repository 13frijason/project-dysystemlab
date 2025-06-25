const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  console.log('delete-estimate function called');
  console.log('HTTP Method:', event.httpMethod);
  console.log('Headers:', event.headers);
  
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
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

  // DELETE 요청만 허용
  if (event.httpMethod !== 'DELETE') {
    console.log('Method not allowed:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Parsing request body...');
    console.log('Request body:', event.body);
    const { id } = JSON.parse(event.body);
    
    console.log('Deleting estimate with ID:', id);
    
    if (!id) {
      console.log('No ID provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '견적문의 ID가 필요합니다.' })
      };
    }

    // 먼저 Supabase에서 삭제 시도
    console.log('Attempting to delete from Supabase...');
    const { data: supabaseData, error: supabaseError, count } = await supabase
      .from('estimates')
      .delete()
      .eq('id', id)
      .select();

    console.log('Supabase delete response:', { supabaseData, supabaseError, count });

    // Supabase 삭제가 실패하면 파일 시스템에서 삭제 시도
    if (supabaseError) {
      console.log('Supabase delete failed, trying file system...');
      
      // 파일 시스템에서 삭제
      const estimatesDir = path.join(process.cwd(), 'content', 'estimates');
      let estimateFilePath = path.join(estimatesDir, `${id}.json`);
      
      // ID가 이미 .json 확장자를 포함하고 있는지 확인
      if (id.endsWith('.json')) {
        estimateFilePath = path.join(estimatesDir, id);
      }
      
      console.log('Estimate file path:', estimateFilePath);
      
      if (fs.existsSync(estimateFilePath)) {
        fs.unlinkSync(estimateFilePath);
        console.log('Deleted estimate file:', estimateFilePath);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: '견적문의가 성공적으로 삭제되었습니다.',
            method: 'file_system'
          })
        };
      } else {
        console.log('Estimate file not found');
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: '삭제할 견적문의를 찾을 수 없습니다.' })
        };
      }
    }

    // Supabase 삭제 성공
    if (!supabaseData || supabaseData.length === 0) {
      console.log('No rows were deleted from Supabase');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: '삭제할 견적문의를 찾을 수 없습니다.' })
      };
    }

    console.log('Estimate deleted successfully from Supabase:', supabaseData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '견적문의가 성공적으로 삭제되었습니다.',
        method: 'supabase'
      })
    };

  } catch (error) {
    console.error('Delete estimate error:', error);
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