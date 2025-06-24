const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    // CORS 헤더 설정
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        console.log('Handling get-construction request:', event.path);
        
        // 페이지네이션 파라미터 파싱
        const queryParams = event.queryStringParameters || {};
        const page = parseInt(queryParams.page) || 1;
        const perPage = parseInt(queryParams.per_page) || 10;
        
        console.log('Page:', page, 'Per page:', perPage);
        
        // 게시물 디렉토리 경로
        const postsDir = path.join(process.cwd(), 'content', 'construction');
        
        // 디렉토리가 없으면 빈 배열 반환
        if (!fs.existsSync(postsDir)) {
            console.log('Construction posts directory does not exist');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify([])
            };
        }
        
        // 모든 JSON 파일 읽기
        const files = fs.readdirSync(postsDir)
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => {
                // 파일명을 기준으로 최신순 정렬 (ID가 timestamp이므로)
                const aId = a.replace('.json', '');
                const bId = b.replace('.json', '');
                return parseInt(bId) - parseInt(aId);
            });
        
        console.log('Found', files.length, 'construction posts');
        
        // 게시물 데이터 읽기
        const posts = [];
        for (const file of files) {
            try {
                const filePath = path.join(postsDir, file);
                const postData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                posts.push(postData);
            } catch (error) {
                console.error('Error reading post file:', file, error);
            }
        }
        
        // 페이지네이션 적용
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedPosts = posts.slice(startIndex, endIndex);
        
        console.log('Returning', paginatedPosts.length, 'posts for page', page);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(paginatedPosts)
        };
        
    } catch (error) {
        console.error('Error getting construction posts:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: '게시물을 불러오는데 실패했습니다.' })
        };
    }
}; 