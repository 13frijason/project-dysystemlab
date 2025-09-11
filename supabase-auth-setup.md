# Supabase 인증 설정 가이드

## 1. 인증 설정 (Authentication Settings)

### Supabase 대시보드 → Authentication → Settings

#### A. 일반 설정 (General)
```
Site URL: https://your-domain.netlify.app
Redirect URLs: 
  - https://your-domain.netlify.app/admin/
  - https://your-domain.netlify.app/admin-login.html
  - http://localhost:8888 (개발용)
```

#### B. 이메일 설정 (Email)
```
Enable email confirmations: ✅ 활성화
Enable email change confirmations: ✅ 활성화
Enable email change notifications: ✅ 활성화
```

#### C. 소셜 로그인 설정 (선택사항)
```
Google OAuth (선택사항):
  - Client ID: [Google OAuth Client ID]
  - Client Secret: [Google OAuth Client Secret]
```

## 2. 사용자 관리 (User Management)

### A. 관리자 사용자 생성
Supabase 대시보드 → Authentication → Users → Invite User

```
Email: admin@yourdomain.com
Password: [강력한 비밀번호]
Role: admin
```

### B. 사용자 역할 설정
Supabase 대시보드 → Authentication → Users에서 각 사용자에게 적절한 역할 부여

## 3. API 키 및 권한 설정

### A. API 키 확인
Supabase 대시보드 → Settings → API

```
Project URL: https://your-project.supabase.co
anon public key: [공개 키]
service_role key: [서비스 역할 키 - 관리자만 사용]
```

### B. Row Level Security (RLS) 정책 확인
Supabase 대시보드 → Authentication → Policies

각 테이블의 정책이 올바르게 설정되었는지 확인:
- estimates: 읽기/쓰기 허용
- construction: 읽기(활성만)/쓰기 허용
- data_backups: 관리자만 접근

## 4. 실시간 기능 설정 (선택사항)

### Supabase 대시보드 → Database → Replication

실시간 업데이트가 필요한 테이블에 대해 Replication 활성화:
```
✅ estimates
✅ construction
```

## 5. 스토리지 설정 (이미지 업로드용)

### Supabase 대시보드 → Storage → Buckets

새 버킷 생성:
```
Name: construction-images
Public: ✅ (공개 접근 허용)
File size limit: 10MB
Allowed MIME types: image/jpeg, image/png, image/webp
```

### 버킷 정책 설정
```sql
-- 버킷 읽기 정책
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'construction-images');

-- 버킷 쓰기 정책 (인증된 사용자만)
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'construction-images' 
  AND auth.role() = 'authenticated'
);
```

## 6. 환경 변수 설정

### Netlify 환경 변수
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (관리자 기능용)
BACKUP_API_KEY=auto-backup-key-2024
```

### 로컬 개발용 .env 파일
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NETLIFY_DEV=true
BACKUP_API_KEY=auto-backup-key-2024
```

## 7. 보안 설정

### A. API 속도 제한
Supabase 대시보드 → Settings → API → Rate Limiting

```
RPC calls per minute: 60
Database queries per minute: 300
```

### B. CORS 설정
Supabase 대시보드 → Settings → API → CORS

```
Allowed Origins:
  - https://your-domain.netlify.app
  - http://localhost:8888
  - http://localhost:3000
```

## 8. 모니터링 설정

### A. 로그 확인
Supabase 대시보드 → Logs에서 다음 로그 모니터링:
- Authentication logs
- Database logs
- API logs

### B. 알림 설정
Supabase 대시보드 → Settings → Notifications에서 오류 알림 설정

## 9. 백업 설정

### A. 자동 백업 활성화
Supabase 대시보드 → Settings → Database → Backups

```
Point-in-time recovery: ✅ 활성화
Backup retention: 7 days
```

### B. 수동 백업 다운로드
Supabase 대시보드 → Settings → Database → Backups에서 필요시 수동 백업 다운로드

## 10. 테스트 체크리스트

### ✅ 설정 완료 확인
- [ ] 모든 테이블이 생성되었는가?
- [ ] RLS 정책이 올바르게 설정되었는가?
- [ ] API 키가 올바른가?
- [ ] 인증 설정이 완료되었는가?
- [ ] 환경 변수가 설정되었는가?
- [ ] 테스트 데이터가 삽입되었는가?

### ✅ 기능 테스트
- [ ] 견적문의 작성 테스트
- [ ] 게시판 조회 테스트
- [ ] 관리자 로그인 테스트
- [ ] 데이터 삭제 테스트
- [ ] 백업/복원 테스트
