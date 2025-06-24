const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // GET 요청만 허용
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // 관리자 권한 확인
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.includes('Bearer')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: '관리자 권한이 필요합니다.' })
    };
  }

  try {
    const dataDir = path.join(process.cwd(), 'content', 'estimates');
    
    // 디렉토리가 없으면 빈 통계 반환
    try {
      await fs.access(dataDir);
    } catch (err) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          total_estimates: 0,
          status_counts: {},
          service_type_counts: {},
          recent_activity: [],
          storage_size: '0 KB'
        })
      };
    }

    // 모든 JSON 파일 읽기
    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const estimates = [];
    let totalSize = 0;
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(dataDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        
        const content = await fs.readFile(filePath, 'utf8');
        const estimate = JSON.parse(content);
        estimates.push(estimate);
      } catch (err) {
        console.error(`Error reading file ${file}:`, err);
      }
    }

    // 통계 계산
    const statusCounts = {};
    const serviceTypeCounts = {};
    const recentActivity = [];

    estimates.forEach(estimate => {
      // 상태별 카운트
      statusCounts[estimate.status] = (statusCounts[estimate.status] || 0) + 1;
      
      // 서비스 타입별 카운트
      serviceTypeCounts[estimate.service_type] = (serviceTypeCounts[estimate.service_type] || 0) + 1;
      
      // 최근 활동 (최근 10개)
      recentActivity.push({
        id: estimate.id,
        title: estimate.title,
        status: estimate.status,
        created_at: estimate.created_at
      });
    });

    // 최근 활동 정렬 (최신순)
    recentActivity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    recentActivity.splice(10); // 최근 10개만

    // 저장소 크기 포맷팅
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        total_estimates: estimates.length,
        status_counts: statusCounts,
        service_type_counts: serviceTypeCounts,
        recent_activity: recentActivity,
        storage_size: formatBytes(totalSize),
        last_updated: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '서버 오류가 발생했습니다.' })
    };
  }
}; 