// Supabase 프로젝트 상태 모니터링 시스템
class SupabaseMonitor {
    constructor() {
        this.checkInterval = null;
        this.isMonitoring = false;
        this.lastCheckTime = null;
        this.consecutiveFailures = 0;
        this.maxFailures = 3;
        this.init();
    }

    init() {
        if (this.isMonitoring) return;
        
        console.log('SupabaseMonitor initializing...');
        this.startMonitoring();
        this.setupVisibilityChangeHandler();
        this.isMonitoring = true;
    }

    // 모니터링 시작
    startMonitoring() {
        // 30분마다 상태 확인
        this.checkInterval = setInterval(async () => {
            await this.checkProjectStatus();
        }, 30 * 60 * 1000); // 30분

        // 즉시 한 번 확인
        this.checkProjectStatus();
    }

    // 페이지 가시성 변경 시 상태 확인
    setupVisibilityChangeHandler() {
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                console.log('Page became visible, checking Supabase status...');
                await this.checkProjectStatus();
            }
        });
    }

    // 프로젝트 상태 확인
    async checkProjectStatus() {
        try {
            console.log('Checking Supabase project status...');
            this.lastCheckTime = new Date().toISOString();

            const response = await fetch('/.netlify/functions/keep-alive', {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            const result = await response.json();

            if (response.status === 200) {
                // 프로젝트가 활성 상태
                this.consecutiveFailures = 0;
                console.log('✅ Supabase project is active:', result);
                
                // 상태 표시 업데이트
                this.updateStatusDisplay('active', result);
                
                // 성공 알림 (첫 번째 성공 시에만)
                if (this.consecutiveFailures === 0) {
                    this.showNotification('프로젝트가 정상적으로 작동 중입니다.', 'success');
                }
                
            } else if (response.status === 503) {
                // 프로젝트가 일시중지됨
                this.consecutiveFailures++;
                console.warn('⚠️ Supabase project is paused:', result);
                
                // 상태 표시 업데이트
                this.updateStatusDisplay('paused', result);
                
                // 사용자에게 알림
                this.showProjectPausedNotification(result);
                
            } else {
                // 기타 오류
                this.consecutiveFailures++;
                console.error('❌ Supabase check failed:', result);
                
                // 상태 표시 업데이트
                this.updateStatusDisplay('error', result);
            }

        } catch (error) {
            this.consecutiveFailures++;
            console.error('Supabase status check error:', error);
            
            // 네트워크 오류 등
            this.updateStatusDisplay('error', { message: '연결 오류가 발생했습니다.' });
            
            // 연속 실패 시 알림
            if (this.consecutiveFailures >= this.maxFailures) {
                this.showNotification('Supabase 연결에 문제가 있습니다. 관리자에게 문의하세요.', 'error');
            }
        }
    }

    // 프로젝트 일시중지 알림
    showProjectPausedNotification(result) {
        const message = `
            <div style="text-align: center; padding: 20px;">
                <h3>🚨 프로젝트 일시중지</h3>
                <p>Supabase 프로젝트가 일시중지되었습니다.</p>
                <p><strong>해결 방법:</strong></p>
                <ol style="text-align: left; display: inline-block;">
                    <li>Supabase 대시보드에 접속</li>
                    <li>프로젝트 선택</li>
                    <li>"Resume Project" 클릭</li>
                </ol>
                <br>
                <button onclick="window.open('${result.supabase_url}', '_blank')" 
                        style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                    Supabase 대시보드 열기
                </button>
                <br><br>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: #6b7280; color: white; padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer;">
                    닫기
                </button>
            </div>
        `;

        // 기존 알림 제거
        const existingAlert = document.getElementById('supabase-paused-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // 새 알림 표시
        const alertDiv = document.createElement('div');
        alertDiv.id = 'supabase-paused-alert';
        alertDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #ef4444;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 500px;
            width: 90%;
        `;
        alertDiv.innerHTML = message;

        document.body.appendChild(alertDiv);

        // 30초 후 자동 제거
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 30000);
    }

    // 상태 표시 업데이트
    updateStatusDisplay(status, data) {
        // 상태 표시 요소 찾기 또는 생성
        let statusElement = document.getElementById('supabase-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'supabase-status';
            statusElement.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 15px;
                border-radius: 5px;
                font-size: 12px;
                font-weight: 500;
                z-index: 1000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(statusElement);
        }

        // 상태에 따른 스타일 설정
        switch (status) {
            case 'active':
                statusElement.style.background = '#10b981';
                statusElement.style.color = 'white';
                statusElement.textContent = `✅ Supabase 정상 (${data.estimates_count || 0}개 견적)`;
                break;
            case 'paused':
                statusElement.style.background = '#ef4444';
                statusElement.style.color = 'white';
                statusElement.textContent = '🚨 Supabase 일시중지';
                break;
            case 'error':
                statusElement.style.background = '#f59e0b';
                statusElement.style.color = 'white';
                statusElement.textContent = '⚠️ Supabase 오류';
                break;
        }

        // 5초 후 상태 표시 숨기기 (오류가 아닌 경우)
        if (status === 'active') {
            setTimeout(() => {
                if (statusElement && statusElement.style) {
                    statusElement.style.opacity = '0.7';
                }
            }, 5000);
        }
    }

    // 일반 알림 표시
    showNotification(message, type = 'info') {
        // 기존 알림 제거
        const existingNotification = document.getElementById('supabase-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'supabase-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            max-width: 300px;
            word-wrap: break-word;
        `;

        switch (type) {
            case 'success':
                notification.style.background = '#10b981';
                break;
            case 'error':
                notification.style.background = '#ef4444';
                break;
            case 'warning':
                notification.style.background = '#f59e0b';
                break;
            default:
                notification.style.background = '#3b82f6';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // 5초 후 자동 제거
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // 모니터링 중지
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isMonitoring = false;
        console.log('SupabaseMonitor stopped');
    }

    // 수동 상태 확인
    async manualCheck() {
        console.log('Manual Supabase status check requested');
        await this.checkProjectStatus();
    }
}

// 전역 모니터 인스턴스
window.supabaseMonitor = new SupabaseMonitor();

// 유틸리티 함수
window.supabaseUtils = {
    // 수동 상태 확인
    checkStatus: () => window.supabaseMonitor.manualCheck(),
    
    // 모니터링 시작/중지
    startMonitoring: () => window.supabaseMonitor.startMonitoring(),
    stopMonitoring: () => window.supabaseMonitor.stopMonitoring(),
    
    // 상태 정보 가져오기
    getStatus: () => ({
        isMonitoring: window.supabaseMonitor.isMonitoring,
        lastCheckTime: window.supabaseMonitor.lastCheckTime,
        consecutiveFailures: window.supabaseMonitor.consecutiveFailures
    })
};

console.log('SupabaseMonitor loaded');
