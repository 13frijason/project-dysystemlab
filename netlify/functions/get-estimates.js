const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  console.log('get-estimates function called');
  console.log('HTTP method:', event.httpMethod);
  console.log('Query parameters:', event.queryStringParameters);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
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

  // GET 요청만 허용
  if (event.httpMethod !== 'GET') {
    console.log('Invalid method:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const cwd = process.cwd();
    console.log('Current working directory:', cwd);
    
    const dataDir = path.join(cwd, 'content', 'estimates');
    console.log('Data directory:', dataDir);
    
    // 디렉토리가 없으면 빈 배열 반환
    try {
      await fs.access(dataDir);
      console.log('Data directory exists');
    } catch (err) {
      console.log('Data directory does not exist, returning empty array');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          estimates: [],
          total: 0,
          page: 1,
          per_page: 10,
          total_pages: 0,
          has_more: false
        })
      };
    }

    // 모든 JSON 파일 읽기
    console.log('Reading directory contents...');
    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    console.log(`Found ${jsonFiles.length} JSON files`);
    
    // 파일 수가 많을 경우를 대비한 최적화
    const estimates = [];
    const batchSize = 50; // 한 번에 처리할 파일 수
    
    for (let i = 0; i < jsonFiles.length; i += batchSize) {
      const batch = jsonFiles.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const filePath = path.join(dataDir, file);
          console.log(`Reading file: ${filePath}`);
          const content = await fs.readFile(filePath, 'utf8');
          const estimate = JSON.parse(content);
          
          // 개인정보 마스킹 (관리자가 아닌 경우)
          const isAdmin = event.headers.authorization && event.headers.authorization.includes('Bearer');
          
          if (!isAdmin) {
            estimate.name = maskName(estimate.name);
            estimate.phone = maskPhone(estimate.phone);
          }
          
          return estimate;
        } catch (err) {
          console.error(`Error reading file ${file}:`, err);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      estimates.push(...batchResults.filter(estimate => estimate !== null));
    }

    console.log(`Successfully loaded ${estimates.length} estimates`);

    // 날짜순으로 정렬 (최신순)
    estimates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 페이지네이션 처리
    const page = parseInt(event.queryStringParameters?.page) || 1;
    const perPage = parseInt(event.queryStringParameters?.per_page) || 10;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedEstimates = estimates.slice(startIndex, endIndex);
    
    const totalPages = Math.ceil(estimates.length / perPage);
    const hasMore = page < totalPages;

    console.log(`Pagination: page ${page}, perPage ${perPage}, total ${estimates.length}, totalPages ${totalPages}`);

    // 캐시 헤더 추가 (5분 캐시)
    headers['Cache-Control'] = 'public, max-age=300';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        estimates: paginatedEstimates,
        total: estimates.length,
        page: page,
        per_page: perPage,
        total_pages: totalPages,
        has_more: hasMore
      })
    };

  } catch (error) {
    console.error('Error in get-estimates:', error);
    console.error('Error stack:', error.stack);
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

// 이름 마스킹 함수
function maskName(name) {
  if (!name) return '';
  if (name.length <= 2) return name.charAt(0) + '*';
  return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
}

// 전화번호 마스킹 함수
function maskPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 4) return phone;
  return cleaned.substring(0, 4) + '-****-' + cleaned.substring(cleaned.length - 4);
} 