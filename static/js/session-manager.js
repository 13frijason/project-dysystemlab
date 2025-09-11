// 세션 관리 및 토큰 갱신 시스템
class SessionManager {
    constructor() {
        this.tokenRefreshInterval = null;
        this.sessionCheckInterval = null;
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        console.log('SessionManager initializing...');
        this.setupTokenRefresh();
        this.setupSessionCheck();
        this.setupVisibilityChangeHandler();
        this.isInitialized = true;
    }

    // 토큰 자동 갱신 설정
    setupTokenRefresh() {
        // 5분마다 토큰 갱신 시도
        this.tokenRefreshInterval = setInterval(async () => {
            await this.refreshToken();
        }, 5 * 60 * 1000); // 5분
    }

    // 세션 상태 주기적 확인
    setupSessionCheck() {
        // 1분마다 세션 상태 확인
        this.sessionCheckInterval = setInterval(() => {
            this.checkSessionStatus();
        }, 60 * 1000); // 1분
    }

    // 페이지 가시성 변경 시 토큰 갱신
    setupVisibilityChangeHandler() {
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                console.log('Page became visible, refreshing token...');
                await this.refreshToken();
            }
        });
    }

    // 토큰 갱신
    async refreshToken() {
        try {
            if (window.netlifyIdentity && window.netlifyIdentity.currentUser()) {
                console.log('Refreshing Netlify Identity token...');
                const user = window.netlifyIdentity.currentUser();
                const newToken = await user.jwt(true); // 강제 갱신
                console.log('Token refreshed successfully');
                
                // 로컬 스토리지에 토큰 갱신 시간 저장
                localStorage.setItem('lastTokenRefresh', Date.now().toString());
                
                return newToken;
            }
        } catch (error) {
            console.warn('Token refresh failed:', error);
            
            // 토큰 갱신 실패 시 재로그인 안내
            if (error.message && error.message.includes('expired')) {
                this.handleTokenExpiry();
            }
        }
        return null;
    }

    // 세션 상태 확인
    checkSessionStatus() {
        try {
            if (window.netlifyIdentity && window.netlifyIdentity.currentUser()) {
                const user = window.netlifyIdentity.currentUser();
                const token = user.jwt();
                
                if (token) {
                    // 토큰 만료 시간 확인 (간단한 체크)
                    const lastRefresh = localStorage.getItem('lastTokenRefresh');
                    if (lastRefresh) {
                        const timeSinceRefresh = Date.now() - parseInt(lastRefresh);
                        const maxAge = 24 * 60 * 60 * 1000; // 24시간
                        
                        if (timeSinceRefresh > maxAge) {
                            console.log('Token is old, refreshing...');
                            this.refreshToken();
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Session check failed:', error);
        }
    }

    // 토큰 만료 처리
    handleTokenExpiry() {
        console.log('Token expired, handling expiry...');
        
        // 사용자에게 알림
        if (confirm('로그인 세션이 만료되었습니다. 다시 로그인하시겠습니까?')) {
            // 로컬 스토리지 정리
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminInfo');
            localStorage.removeItem('lastTokenRefresh');
            
            // 로그인 페이지로 이동
            window.location.href = 'admin-login.html';
        }
    }

    // 네트워크 요청 재시도 로직
    async fetchWithRetry(url, options = {}, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                // 토큰 갱신 시도
                await this.refreshToken();
                
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                        ...options.headers
                    }
                });
                
                if (response.status === 401 && i < retries - 1) {
                    console.log(`Request failed with 401, retrying... (${i + 1}/${retries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                    continue;
                }
                
                return response;
            } catch (error) {
                console.error(`Request attempt ${i + 1} failed:`, error);
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    // 세션 매니저 정리
    destroy() {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }
        this.isInitialized = false;
    }
}

// 전역 세션 매니저 인스턴스
window.sessionManager = new SessionManager();

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (window.sessionManager) {
        window.sessionManager.destroy();
    }
});

// 유틸리티 함수들
window.utils = {
    // 안전한 fetch 함수
    async safeFetch(url, options = {}) {
        return await window.sessionManager.fetchWithRetry(url, options);
    },

    // 토큰과 함께 fetch
    async authenticatedFetch(url, options = {}) {
        const headers = { ...options.headers };
        
        if (window.netlifyIdentity && window.netlifyIdentity.currentUser()) {
            try {
                const token = await window.netlifyIdentity.currentUser().jwt(true);
                headers['Authorization'] = `Bearer ${token}`;
            } catch (error) {
                console.warn('Failed to get token:', error);
            }
        }
        
        return await window.sessionManager.fetchWithRetry(url, {
            ...options,
            headers
        });
    },

    // 로그인 상태 확인
    isLoggedIn() {
        return window.netlifyIdentity && window.netlifyIdentity.currentUser();
    },

    // 관리자 로그인 상태 확인
    isAdminLoggedIn() {
        const adminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
        return adminLoggedIn && adminInfo.username;
    }
};

console.log('SessionManager and utilities loaded');
