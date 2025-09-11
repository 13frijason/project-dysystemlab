# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 가입
2. 새 프로젝트 생성
3. 프로젝트 URL과 API 키 확인

## 2. 데이터베이스 테이블 생성

### 견적문의 테이블 (이미 생성된 경우 건너뛰기)

SQL 편집기에서 다음 쿼리 실행:

```sql
-- 견적문의 테이블 생성 (이미 존재하는 경우 오류 무시)
CREATE TABLE IF NOT EXISTS estimates (
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

-- 정책이 존재하지 않는 경우에만 생성
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'estimates' AND policyname = 'Allow anonymous read access') THEN
    CREATE POLICY "Allow anonymous read access" ON estimates FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'estimates' AND policyname = 'Allow anonymous insert') THEN
    CREATE POLICY "Allow anonymous insert" ON estimates FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'estimates' AND policyname = 'Allow admin delete') THEN
    CREATE POLICY "Allow admin delete" ON estimates FOR DELETE USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'estimates' AND policyname = 'Allow admin update') THEN
    CREATE POLICY "Allow admin update" ON estimates FOR UPDATE USING (true);
  END IF;
END $$;
```

### 시공사진 테이블 생성

```sql
-- 시공사진 테이블 생성
CREATE TABLE IF NOT EXISTS construction (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  image_data TEXT NOT NULL,
  image_name TEXT,
  status TEXT DEFAULT '활성',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 설정
ALTER TABLE construction ENABLE ROW LEVEL SECURITY;

-- 시공사진 테이블 정책 생성 (조건부 생성)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'construction' AND policyname = 'Allow anonymous read access') THEN
    CREATE POLICY "Allow anonymous read access" ON construction
      FOR SELECT USING (status = '활성');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'construction' AND policyname = 'Allow anonymous insert') THEN
    CREATE POLICY "Allow anonymous insert" ON construction
      FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'construction' AND policyname = 'Allow admin update') THEN
    CREATE POLICY "Allow admin update" ON construction
      FOR UPDATE USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'construction' AND policyname = 'Allow admin delete') THEN
    CREATE POLICY "Allow admin delete" ON construction
      FOR DELETE USING (true);
  END IF;
END $$;
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

### 백업 테이블 생성

```sql
-- 데이터 백업 테이블 생성
CREATE TABLE IF NOT EXISTS data_backups (
  id BIGSERIAL PRIMARY KEY,
  backup_data JSONB NOT NULL,
  backup_type TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 설정
ALTER TABLE data_backups ENABLE ROW LEVEL SECURITY;

-- 백업 테이블 정책 생성
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data_backups' AND policyname = 'Allow admin access') THEN
    CREATE POLICY "Allow admin access" ON data_backups FOR ALL USING (true);
  END IF;
END $$;
```

### 자동 백업 설정

1. Netlify 환경 변수에 추가:
```
BACKUP_API_KEY=auto-backup-key-2024
```

2. GitHub Actions 또는 cron job으로 자동 백업 스케줄링 (선택사항):
```yaml
# .github/workflows/auto-backup.yml
name: Auto Backup
on:
  schedule:
    - cron: '0 2 * * *'  # 매일 오전 2시
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Backup
        run: |
          curl -X POST \
            -H "x-backup-key: ${{ secrets.BACKUP_API_KEY }}" \
            https://your-site.netlify.app/.netlify/functions/auto-backup
```

## 5. 테스트

1. 로컬 서버 실행: `netlify dev`
2. 견적문의 폼 테스트
3. Supabase 대시보드에서 데이터 확인
4. 관리자 페이지에서 백업/복원 기능 테스트 