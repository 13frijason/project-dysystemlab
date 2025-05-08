document.addEventListener('DOMContentLoaded', function() {
    // 전화번호 입력 필드 포맷팅
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let number = e.target.value.replace(/[^0-9]/g, '');
            if (number.length > 11) {
                number = number.slice(0, 11);
            }
            if (number.length > 7) {
                number = number.slice(0, 3) + '-' + number.slice(3, 7) + '-' + number.slice(7);
            } else if (number.length > 3) {
                number = number.slice(0, 3) + '-' + number.slice(3);
            }
            e.target.value = number;
        });
    }

    // 견적문의 폼 제출
    const estimateForm = document.getElementById('estimateForm');
    if (estimateForm) {
        estimateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 필수 필드 검증
            const requiredFields = ['name', 'phone', 'address', 'location', 'size', 'type'];
            let isValid = true;
            
            requiredFields.forEach(field => {
                const input = document.getElementById(field);
                if (!input.value.trim()) {
                    isValid = false;
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
            });

            if (!isValid) {
                alert('필수 항목을 모두 입력해주세요.');
                return;
            }

            // 폼 데이터를 JSON으로 변환
            const formData = new FormData(estimateForm);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }

            // API 요청
            fetch('/api/estimates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw err; });
                }
                return response.json();
            })
            .then(data => {
                alert('견적문의가 성공적으로 등록되었습니다.');
                window.location.href = '/board';
            })
            .catch(error => {
                alert('견적문의 등록 중 오류가 발생했습니다: ' + (error.error || '알 수 없는 오류'));
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
}); 