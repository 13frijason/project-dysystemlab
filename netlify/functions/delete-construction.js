const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    console.log('delete-construction function called');
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

    if (event.httpMethod !== 'DELETE') {
        console.log('Method not allowed:', event.httpMethod);
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        console.log('Received construction deletion request');
        console.log('Request body:', event.body);
        
        // 요청 본문 파싱
        const requestBody = JSON.parse(event.body);
        const { id } = requestBody;
        
        if (!id) {
            console.log('No ID provided');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '게시물 ID가 필요합니다.' })
            };
        }
        
        console.log('Deleting construction post with ID:', id);
        
        // 게시물 파일 경로
        const postsDir = path.join(process.cwd(), 'content', 'construction');
        const postFilePath = path.join(postsDir, `${id}.json`);
        
        console.log('Post file path:', postFilePath);
        
        // 게시물 파일이 존재하는지 확인
        if (!fs.existsSync(postFilePath)) {
            console.log('Post file not found');
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: '게시물을 찾을 수 없습니다.' })
            };
        }
        
        // 게시물 데이터 읽기 (이미지 경로 확인용)
        const postData = JSON.parse(fs.readFileSync(postFilePath, 'utf8'));
        console.log('Post data loaded');
        
        // 게시물 파일 삭제
        fs.unlinkSync(postFilePath);
        console.log('Deleted post file:', postFilePath);
        
        // 이미지 파일은 base64로 저장되어 있으므로 별도 삭제 불필요
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: '게시물이 성공적으로 삭제되었습니다.' 
            })
        };
        
    } catch (error) {
        console.error('Error deleting construction post:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: '게시물 삭제 중 오류가 발생했습니다.' })
        };
    }
}; 