document.addEventListener('DOMContentLoaded', function() {
    // 스크롤 시 헤더 스타일 변경
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 전화번호 입력 필드 포맷팅
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                if (value.length <= 3) {
                    value = value;
                } else if (value.length <= 7) {
                    value = value.slice(0, 3) + '-' + value.slice(3);
                } else {
                    value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
                }
            }
            e.target.value = value;
        });
    }

    // 스크롤 애니메이션
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('nav a');

    function highlightNavLink() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').substring(1) === current) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', highlightNavLink);

    // 부드러운 스크롤
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    const offset = targetId === '#construction' ? 100 : 80;
                    window.scrollTo({
                        top: targetSection.offsetTop - offset,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // 견적문의 폼 제출 처리
    const estimateForm = document.querySelector('.estimate-form');
    if (estimateForm) {
        estimateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 필수 필드 검증
            const requiredFields = estimateForm.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                } else {
                    field.classList.remove('error');
                }
            });
            
            if (!isValid) {
                alert('모든 필수 항목을 입력해주세요.');
                return;
            }
            
            // 폼 데이터 수집
            const formData = new FormData(estimateForm);
            const data = Object.fromEntries(formData.entries());
            
            // API 요청
            fetch('/submit_estimate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert('견적문의가 성공적으로 접수되었습니다.');
                    estimateForm.reset();
                } else {
                    alert('견적문의 접수 중 오류가 발생했습니다.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('견적문의 접수 중 오류가 발생했습니다.');
            });
        });
    }

    // 삭제 모달 관련 함수들
    window.showDeleteModal = function(id) {
        const modal = document.getElementById('deleteModal');
        modal.style.display = 'block';
        
        const confirmButton = document.getElementById('confirmDelete');
        confirmButton.onclick = function() {
            deleteEstimate(id);
        };
    }

    window.closeDeleteModal = function() {
        const modal = document.getElementById('deleteModal');
        modal.style.display = 'none';
    }

    function deleteEstimate(id) {
        fetch(`/api/estimates/${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('삭제 실패');
            }
            window.location.reload();
        })
        .catch(error => {
            alert('견적문의 삭제 중 오류가 발생했습니다.');
        })
        .finally(() => {
            closeDeleteModal();
        });
    }

    // 견적문의 상세 보기 페이지에서 뒤로가기
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.history.back();
        });
    }

    // 슬라이더 기능
    const sliderTrack = document.querySelector('.slider-track');
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const navDots = document.querySelector('.nav-dots');
    
    let currentIndex = 0;
    let slideWidth = slides[0].clientWidth;
    let autoSlideInterval;
    
    // 도트 네비게이션 생성
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        navDots.appendChild(dot);
    });
    
    const dots = document.querySelectorAll('.dot');
    
    function updateDots() {
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }
    
    function goToSlide(index) {
        currentIndex = index;
        sliderTrack.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
        updateDots();
    }
    
    function nextSlide() {
        currentIndex = (currentIndex + 1) % slides.length;
        goToSlide(currentIndex);
    }
    
    function prevSlide() {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        goToSlide(currentIndex);
    }
    
    // 자동 슬라이드 시작
    function startAutoSlide() {
        autoSlideInterval = setInterval(nextSlide, 5000);
    }
    
    // 자동 슬라이드 정지
    function stopAutoSlide() {
        clearInterval(autoSlideInterval);
    }
    
    // 이벤트 리스너
    prevBtn.addEventListener('click', () => {
        prevSlide();
        stopAutoSlide();
        startAutoSlide();
    });
    
    nextBtn.addEventListener('click', () => {
        nextSlide();
        stopAutoSlide();
        startAutoSlide();
    });
    
    // 터치 이벤트 처리
    let touchStartX = 0;
    let touchEndX = 0;
    
    sliderTrack.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        stopAutoSlide();
    });
    
    sliderTrack.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        handleSwipe();
        startAutoSlide();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
    }
    
    // 반응형 대응
    function updateSlideWidth() {
        slideWidth = slides[0].clientWidth;
        goToSlide(currentIndex);
    }
    
    window.addEventListener('resize', updateSlideWidth);
    
    // 초기화
    updateSlideWidth();
    startAutoSlide();
}); 