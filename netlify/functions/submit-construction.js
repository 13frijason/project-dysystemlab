const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
    console.log('submit-construction function called');
    console.log('HTTP method:', event.httpMethod);
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
        if (!data.title || !data.date || !data.description || !data.imageData) {
            console.log('Missing required fields:', { 
                title: !!data.title, 
                date: !!data.date, 
                description: !!data.description, 
                imageData: !!data.imageData 
            });
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '모든 필드를 입력해주세요.' })
            };
        }

        // Supabase에 데이터 저장
        const { data: construction, error } = await supabase
            .from('construction')
            .insert([
                {
                    title: data.title,
                    date: data.date,
                    description: data.description,
                    image_data: data.imageData,
                    image_name: data.imageName || 'image.jpg',
                    status: '활성',
                    ip_address: event.headers['client-ip'] || 'unknown',
                    user_agent: event.headers['user-agent'] || 'unknown'
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw new Error(`데이터베이스 저장 실패: ${error.message}`);
        }

        console.log('Successfully saved to Supabase:', construction);

        // 성공 응답
        console.log('Sending success response');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: '시공사진이 성공적으로 등록되었습니다.',
                id: construction.id
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