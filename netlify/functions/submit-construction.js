const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

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
        
        // FormData 파싱
        const formData = new FormData();
        const boundary = event.headers['content-type'].split('boundary=')[1];
        
        // multipart/form-data 파싱
        const body = Buffer.from(event.body, 'base64');
        const parts = body.toString().split(`--${boundary}`);
        
        let title, date, description, imageData, imageName;
        
        for (const part of parts) {
            if (part.includes('Content-Disposition: form-data')) {
                const lines = part.split('\r\n');
                let fieldName = '';
                let fieldValue = '';
                let isFile = false;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.includes('Content-Disposition: form-data; name=')) {
                        const nameMatch = line.match(/name="([^"]+)"/);
                        if (nameMatch) {
                            fieldName = nameMatch[1];
                        }
                        
                        // 파일인지 확인
                        if (line.includes('filename=')) {
                            isFile = true;
                            const filenameMatch = line.match(/filename="([^"]+)"/);
                            if (filenameMatch) {
                                imageName = filenameMatch[1];
                            }
                        }
                    } else if (line === '' && i + 1 < lines.length) {
                        // 빈 줄 다음부터가 실제 데이터
                        fieldValue = lines.slice(i + 1).join('\r\n').trim();
                        break;
                    }
                }
                
                if (fieldName === 'title') {
                    title = fieldValue;
                } else if (fieldName === 'date') {
                    date = fieldValue;
                } else if (fieldName === 'description') {
                    description = fieldValue;
                } else if (fieldName === 'image' && isFile) {
                    imageData = fieldValue;
                }
            }
        }
        
        console.log('Parsed form data:', { title, date, description, imageName });
        
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