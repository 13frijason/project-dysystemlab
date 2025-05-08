// 스크롤 시 네비게이션 바 스타일 변경
window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    } else {
        header.style.backgroundColor = '#fff';
    }
});

// 스무스 스크롤 구현
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// 견적 폼 제출 처리
const estimateForm = document.getElementById('estimateForm');
if (estimateForm) {
    estimateForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 폼 데이터 수집
        const formData = new FormData(this);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // 여기에서 실제 서버로 데이터를 전송하는 코드를 구현할 수 있습니다
        // 현재는 콘솔에 출력하고 알림을 표시합니다
        console.log('견적 요청 데이터:', data);
        
        // 사용자에게 알림
        alert('견적 요청이 성공적으로 접수되었습니다. 곧 연락드리겠습니다.');
        
        // 폼 초기화
        this.reset();
    });
}

// 전화번호 입력 필드 자동 포맷팅
const phoneInput = document.getElementById('phone');
if (phoneInput) {
    phoneInput.addEventListener('input', function(e) {
        let number = this.value.replace(/[^0-9]/g, '');
        if (number.length > 3 && number.length <= 7) {
            number = number.substring(0,3) + '-' + number.substring(3);
        } else if (number.length > 7) {
            number = number.substring(0,3) + '-' + number.substring(3,7) + '-' + number.substring(7,11);
        }
        this.value = number;
    });
}

// 서비스 카드 애니메이션
const serviceCards = document.querySelectorAll('.service-card');
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px'
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

serviceCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.5s ease-out';
    observer.observe(card);
}); 

// 게시판 관련 함수들
const boardStorage = {
    // 게시물 저장
    savePost: function(post) {
        let posts = this.getAllPosts();
        post.id = Date.now(); // 고유 ID 생성
        post.created_at = new Date().toLocaleString();
        post.status = '대기중';
        posts.push(post);
        localStorage.setItem('posts', JSON.stringify(posts));
        return post;
    },

    // 모든 게시물 가져오기
    getAllPosts: function() {
        const posts = localStorage.getItem('posts');
        return posts ? JSON.parse(posts) : [];
    },

    // 특정 게시물 가져오기
    getPost: function(id) {
        const posts = this.getAllPosts();
        return posts.find(post => post.id === parseInt(id));
    },

    // 게시물 삭제
    deletePost: function(id) {
        let posts = this.getAllPosts();
        posts = posts.filter(post => post.id !== parseInt(id));
        localStorage.setItem('posts', JSON.stringify(posts));
    }
};

// 견적문의 폼 제출 처리
async function handleEstimateSubmit(event) {
    event.preventDefault();
    
    // 필수 필드 검증
    const requiredFields = ['name', 'phone', 'address', 'location', 'size', 'type'];
    const formData = {};
    let hasError = false;

    requiredFields.forEach(field => {
        const input = document.getElementById(field);
        formData[field] = input.value.trim();
        
        if (!formData[field]) {
            hasError = true;
            input.classList.add('error');
            // 에러 메시지 표시
            let errorMsg = input.parentElement.querySelector('.error-message');
            if (!errorMsg) {
                errorMsg = document.createElement('span');
                errorMsg.className = 'error-message';
                input.parentElement.appendChild(errorMsg);
            }
            errorMsg.textContent = '이 필드는 필수입니다.';
        } else {
            input.classList.remove('error');
            const errorMsg = input.parentElement.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
        }
    });

    if (hasError) {
        return;
    }

    // 추가 필드
    formData.install_date = document.getElementById('install_date').value;
    formData.message = document.getElementById('message').value;

    try {
        const response = await fetch('/api/estimates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '견적문의 저장에 실패했습니다.');
        }

        // 성공 메시지 표시
        alert('견적문의가 성공적으로 접수되었습니다.');
        
        // 게시판 페이지로 이동
        window.location.href = '/board';
    } catch (error) {
        alert(error.message);
    }
}

// 게시판 목록 표시
async function displayBoardList() {
    const tbody = document.querySelector('.board-table tbody');
    if (!tbody) return;

    try {
        const response = await fetch('/api/estimates');
        const estimates = await response.json();

        tbody.innerHTML = '';
        
        estimates.forEach(post => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><a href="/view/${post.id}" class="post-title">${post.name}님의 견적문의</a></td>
                <td>${post.type}</td>
                <td>${post.location}</td>
                <td>${post.created_at}</td>
                <td><span class="status-${post.status === '대기중' ? 'pending' : 'completed'}">${post.status}</span></td>
                <td>
                    <button onclick="handleDeletePost(${post.id})" class="delete-button">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('게시물 목록을 불러오는데 실패했습니다:', error);
    }
}

// 게시물 삭제 처리
async function handleDeletePost(id) {
    if (confirm('정말로 이 게시물을 삭제하시겠습니까?')) {
        try {
            const response = await fetch(`/api/estimates/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('게시물 삭제에 실패했습니다.');
            }

            displayBoardList(); // 목록 새로고침
            alert('게시물이 삭제되었습니다.');
        } catch (error) {
            alert(error.message);
        }
    }
}

// 게시물 상세 내용 표시
async function displayPostDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (!postId) return;
    
    try {
        const response = await fetch(`/api/estimates/${postId}`);
        if (!response.ok) {
            throw new Error('게시물을 찾을 수 없습니다.');
        }

        const post = await response.json();
        
        document.getElementById('post-title').textContent = `${post.name}님의 견적문의`;
        document.getElementById('post-date').textContent = post.created_at;
        document.getElementById('post-status').textContent = post.status;
        document.getElementById('post-status').className = `status-${post.status === '대기중' ? 'pending' : 'completed'}`;
        
        const detailsHtml = `
            <p><strong>이름:</strong> ${post.name}</p>
            <p><strong>연락처:</strong> ${post.phone}</p>
            <p><strong>주소:</strong> ${post.address}</p>
            <p><strong>설치장소:</strong> ${post.location}</p>
            <p><strong>면적:</strong> ${post.size}평</p>
            <p><strong>설치희망일:</strong> ${post.install_date || '미지정'}</p>
            <p><strong>설치종류:</strong> ${post.type}</p>
            <p><strong>추가메시지:</strong></p>
            <p>${post.message || '없음'}</p>
        `;
        document.getElementById('post-details').innerHTML = detailsHtml;
    } catch (error) {
        alert(error.message);
        window.location.href = '/board';
    }
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    // 견적문의 폼 제출 이벤트 리스너
    const estimateForm = document.getElementById('estimate-form');
    if (estimateForm) {
        estimateForm.addEventListener('submit', handleEstimateSubmit);
    }
    
    // 게시판 목록 표시
    displayBoardList();
    
    // 게시물 상세 내용 표시
    displayPostDetail();
}); 