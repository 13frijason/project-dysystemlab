const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
    console.log('delete-construction function called');
    console.log('HTTP method:', event.httpMethod);
    console.log('Event body:', event.body);
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
    };

    // OPTIONS 요청 처리
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
        if (!data.id) {
            console.log('Missing required field: id');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '게시물 ID가 필요합니다.' })
            };
        }

        // Supabase에서 데이터 삭제 (실제 삭제 대신 상태를 '삭제됨'으로 변경)
        const { data: deletedConstruction, error } = await supabase
            .from('construction')
            .update({ status: '삭제됨' })
            .eq('id', data.id)
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw new Error(`데이터베이스 삭제 실패: ${error.message}`);
        }

        console.log('Successfully deleted from Supabase:', deletedConstruction);

        // 성공 응답
        console.log('Sending success response');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: '시공사진이 성공적으로 삭제되었습니다.',
                id: data.id
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