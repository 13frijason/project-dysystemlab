# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 가입
2. 새 프로젝트 생성
3. 프로젝트 URL과 API 키 확인

## 2. 데이터베이스 테이블 생성

SQL 편집기에서 다음 쿼리 실행:

```sql
-- 견적문의 테이블 생성
CREATE TABLE estimates (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  service_type TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT '대기중',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 설정
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

-- 익명 사용자 읽기 권한
CREATE POLICY "Allow anonymous read access" ON estimates
  FOR SELECT USING (true);

-- 익명 사용자 삽입 권한
CREATE POLICY "Allow anonymous insert" ON estimates
  FOR INSERT WITH CHECK (true);

-- 관리자 삭제 권한 (모든 행 삭제 가능)
CREATE POLICY "Allow admin delete" ON estimates
  FOR DELETE USING (true);
```

## 3. Netlify 환경 변수 설정

Netlify 대시보드 > Site settings > Environment variables에서:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## 4. 로컬 개발 환경 설정

`.env` 파일 생성:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NETLIFY_DEV=true
```

## 5. 테스트

1. 로컬 서버 실행: `netlify dev`
2. 견적문의 폼 테스트
3. Supabase 대시보드에서 데이터 확인 