-- ==============================================
-- Supabase 완전 설정 스크립트
-- ==============================================

-- 1. 견적문의 테이블 생성
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

-- 2. 시공사진 테이블 생성
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

-- 3. 백업 테이블 생성
CREATE TABLE IF NOT EXISTS data_backups (
  id BIGSERIAL PRIMARY KEY,
  backup_data JSONB NOT NULL,
  backup_type TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_backups ENABLE ROW LEVEL SECURITY;

-- 5. 견적문의 테이블 정책 생성
DO $$
BEGIN
  -- 읽기 권한 (모든 사용자)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'estimates' AND policyname = 'Allow anonymous read access') THEN
    CREATE POLICY "Allow anonymous read access" ON estimates FOR SELECT USING (true);
  END IF;
  
  -- 쓰기 권한 (모든 사용자)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'estimates' AND policyname = 'Allow anonymous insert') THEN
    CREATE POLICY "Allow anonymous insert" ON estimates FOR INSERT WITH CHECK (true);
  END IF;
  
  -- 삭제 권한 (관리자)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'estimates' AND policyname = 'Allow admin delete') THEN
    CREATE POLICY "Allow admin delete" ON estimates FOR DELETE USING (true);
  END IF;
  
  -- 수정 권한 (관리자)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'estimates' AND policyname = 'Allow admin update') THEN
    CREATE POLICY "Allow admin update" ON estimates FOR UPDATE USING (true);
  END IF;
END $$;

-- 6. 시공사진 테이블 정책 생성
DO $$
BEGIN
  -- 읽기 권한 (활성 상태만)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'construction' AND policyname = 'Allow anonymous read access') THEN
    CREATE POLICY "Allow anonymous read access" ON construction
      FOR SELECT USING (status = '활성');
  END IF;
  
  -- 쓰기 권한 (모든 사용자)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'construction' AND policyname = 'Allow anonymous insert') THEN
    CREATE POLICY "Allow anonymous insert" ON construction
      FOR INSERT WITH CHECK (true);
  END IF;
  
  -- 수정 권한 (관리자)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'construction' AND policyname = 'Allow admin update') THEN
    CREATE POLICY "Allow admin update" ON construction
      FOR UPDATE USING (true);
  END IF;
  
  -- 삭제 권한 (관리자)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'construction' AND policyname = 'Allow admin delete') THEN
    CREATE POLICY "Allow admin delete" ON construction
      FOR DELETE USING (true);
  END IF;
END $$;

-- 7. 백업 테이블 정책 생성
DO $$
BEGIN
  -- 모든 권한 (관리자만)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data_backups' AND policyname = 'Allow admin access') THEN
    CREATE POLICY "Allow admin access" ON data_backups FOR ALL USING (true);
  END IF;
END $$;

-- 8. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_construction_created_at ON construction(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_construction_status ON construction(status);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON data_backups(created_at DESC);

-- 9. 업데이트 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. 트리거 생성
DROP TRIGGER IF EXISTS update_estimates_updated_at ON estimates;
CREATE TRIGGER update_estimates_updated_at
    BEFORE UPDATE ON estimates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_construction_updated_at ON construction;
CREATE TRIGGER update_construction_updated_at
    BEFORE UPDATE ON construction
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. 테스트 데이터 삽입 (선택사항)
INSERT INTO estimates (title, name, phone, service_type, content) VALUES
('테스트 견적문의', '홍길동', '010-1234-5678', '에어컨 설치', '테스트용 견적문의입니다.'),
('냉난방 시스템 문의', '김철수', '010-9876-5432', '냉난방 시스템', '냉난방 시스템 견적을 요청합니다.')
ON CONFLICT DO NOTHING;

-- 12. 설정 완료 확인
SELECT 
  'estimates' as table_name, 
  COUNT(*) as row_count 
FROM estimates
UNION ALL
SELECT 
  'construction' as table_name, 
  COUNT(*) as row_count 
FROM construction
UNION ALL
SELECT 
  'data_backups' as table_name, 
  COUNT(*) as row_count 
FROM data_backups;

-- 완료 메시지
SELECT 'Supabase 설정이 완료되었습니다!' as message;
