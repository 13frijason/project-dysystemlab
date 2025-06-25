const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    // CORS 헤더 설정
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        console.log('Received construction submission request');
        
        // JSON 데이터 파싱
        const data = JSON.parse(event.body);
        const { title, date, description, imageData, imageName } = data;
        
        console.log('Parsed form data:', { title, date, description, imageName: imageName || 'unknown' });
        
        // 필수 필드 검증
        if (!title || !date || !description || !imageData) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '모든 필드를 입력해주세요.' })
            };
        }
        
        // 이미지 저장
        const imageId = Date.now().toString();
        const imageExtension = path.extname(imageName || 'image.jpg');
        const imageFileName = `construction_${imageId}${imageExtension}`;
        const imagePath = path.join(process.cwd(), 'static', 'uploads', 'construction', imageFileName);
        
        // 디렉토리 생성
        const uploadDir = path.dirname(imagePath);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // 이미지 데이터 저장 (base64 디코딩)
        const imageBuffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync(imagePath, imageBuffer);
        
        // 게시물 데이터 생성
        const postData = {
            id: imageId,
            title: title,
            date: date,
            description: description,
            imageUrl: `/static/uploads/construction/${imageFileName}`,
            createdAt: new Date().toISOString()
        };
        
        // 게시물 데이터 저장
        const postsDir = path.join(process.cwd(), 'content', 'construction');
        if (!fs.existsSync(postsDir)) {
            fs.mkdirSync(postsDir, { recursive: true });
        }
        
        const postFilePath = path.join(postsDir, `${imageId}.json`);
        fs.writeFileSync(postFilePath, JSON.stringify(postData, null, 2));
        
        console.log('Construction post saved:', postData);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: '게시물이 성공적으로 등록되었습니다.',
                post: postData
            })
        };
        
    } catch (error) {
        console.error('Error submitting construction post:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: '게시물 등록 중 오류가 발생했습니다.' })
        };
    }
}; 