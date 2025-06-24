# 도연시스템연구소 웹사이트

전문적인 냉난방 설비 솔루션을 제공하는 도연시스템연구소의 공식 웹사이트입니다.

**마지막 업데이트**: 2024년 12월 21일 - Netlify Functions 기반 서버리스 게시판 시스템 완성

## 🚀 Netlify 배포 가이드

### 1. Netlify 계정 생성 및 사이트 배포

1. [Netlify](https://netlify.com)에 가입하고 로그인합니다.
2. "New site from Git" 버튼을 클릭합니다.
3. GitHub/GitLab/Bitbucket에서 이 프로젝트를 연결합니다.
4. 배포 설정:
   - **Build command**: 비워두기 (정적 사이트)
   - **Publish directory**: `.` (루트 디렉토리)
5. "Deploy site" 버튼을 클릭합니다.

### 2. Netlify Identity 설정

1. Netlify 대시보드에서 사이트를 선택합니다.
2. **Site settings** → **Identity** 메뉴로 이동합니다.
3. **Enable Identity** 버튼을 클릭하여 활성화합니다.
4. **Registration preferences**에서 **Invite only**로 설정합니다.
5. **Invite users**에서 관리자 이메일을 추가합니다.

### 3. Netlify CMS 설정

1. **Site settings** → **Identity** → **Registration**에서 **Invite only**로 설정합니다.
2. **Site settings** → **Identity** → **Services**에서 **Git Gateway**를 활성화합니다.
3. 관리자 이메일로 초대장을 보내고 계정을 생성합니다.

### 4. 도메인 설정 (선택사항)

1. **Site settings** → **Domain management**에서 커스텀 도메인을 추가할 수 있습니다.
2. DNS 설정을 통해 도메인을 연결합니다.

## 📁 프로젝트 구조

```
도연시스템연구소/
├── index.html              # 메인 페이지
├── login.html              # 로그인 페이지 (Netlify Identity)
├── board.html              # 견적문의 게시판
├── construction.html       # 시공사례 페이지
├── admin/                  # 관리자 페이지
│   ├── index.html         # Netlify CMS 대시보드
│   └── config.yml         # CMS 설정
├── netlify/               # Netlify Functions
│   └── functions/         # 서버리스 함수들
│       ├── submit-estimate.js
│       ├── get-estimates.js
│       └── delete-estimate.js
├── static/                 # 정적 파일
│   ├── css/
│   ├── js/
│   └── images/
├── templates/              # Flask 템플릿 (로컬 개발용)
├── netlify.toml           # Netlify 배포 설정
└── README.md              # 프로젝트 문서
```

## 🔧 주요 기능

### 사용자 기능
- ✅ 회사 소개 및 서비스 안내
- ✅ 견적문의 작성 및 조회 (서버리스)
- ✅ 시공사례 갤러리
- ✅ 반응형 디자인

### 관리자 기능
- ✅ Netlify Identity 기반 로그인
- ✅ Netlify CMS를 통한 콘텐츠 관리
- ✅ 견적문의 관리 (작성/조회/삭제)
- ✅ 시공사례 등록/수정/삭제

### 서버리스 기능
- ✅ Netlify Functions 기반 견적문의 시스템
- ✅ 자동 확장 및 무료 호스팅
- ✅ Git 기반 데이터 관리

## 🛠️ 로컬 개발

### 요구사항
- Node.js 16+
- Netlify CLI

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행
npm run dev
```

### Netlify CMS 로컬 테스트

```bash
# Netlify CMS 로컬 서버 실행
npx netlify-cms-proxy-server
```

## 📧 연락처

- **전화**: 010-2789-3051
- **이메일**: info@doyeon.com
- **주소**: 서울특별시 강남구

## 📄 라이선스

© 2024 도연시스템연구소. All rights reserved. 