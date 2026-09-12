-- ============================================================
-- recon_master 확정계획 컬럼 + recon_docs 문서 테이블
-- 작성일: 2026-09-05
-- 목적: 정비계획 확정값을 저장해 NCMC 계산에 가정(TBD) 대신 실측 우선 사용.
--       긴 정비계획 문서는 recon_docs에 별도 저장(단지당 여러 개).
-- 리서치 파이프라인: 문서(recon_docs) → 숫자추출·검수 → recon_master 확정컬럼 → 엔진 재계산.
-- 재실행 안전: IF NOT EXISTS.
-- 사용자: Supabase SQL Editor에서 실행.
-- ============================================================

-- 1) recon_master: 확정계획 컬럼 (엔진 계산용 실측 숫자)
ALTER TABLE recon_master
  ADD COLUMN IF NOT EXISTS plan_confirmed     BOOLEAN DEFAULT FALSE,   -- 정비계획 확정 여부(true면 아래값 우선)
  ADD COLUMN IF NOT EXISTS plan_far           NUMERIC(6,2),            -- 확정 목표용적률(%) (통합)
  ADD COLUMN IF NOT EXISTS plan_units_new     INTEGER,                 -- 재건축후 총 세대수
  ADD COLUMN IF NOT EXISTS plan_units_rental  INTEGER,                 -- 임대 세대수
  ADD COLUMN IF NOT EXISTS plan_donation_rate NUMERIC(5,3),            -- 확정 기부채납 비율(예: 0.102)
  ADD COLUMN IF NOT EXISTS plan_gfa_new       NUMERIC(12,1),           -- 재건축후 연면적(㎡)
  ADD COLUMN IF NOT EXISTS plan_bcr           NUMERIC(5,2),            -- 건폐율(%)
  ADD COLUMN IF NOT EXISTS plan_ratio         NUMERIC(5,1),            -- 비례율(%) — 사업성 핵심지표(예: 98.5)
  ADD COLUMN IF NOT EXISTS plan_source        TEXT;                    -- 출처/비고(정비계획 고시 등)

COMMENT ON COLUMN recon_master.plan_confirmed IS '정비계획 확정 여부. true면 plan_* 확정값을 NCMC 계산에 우선 사용.';
COMMENT ON COLUMN recon_master.plan_far IS '확정 목표용적률(%). 가정 300% 대신 사용.';
COMMENT ON COLUMN recon_master.plan_donation_rate IS '확정 기부채납 비율(0~1). 가정 0.20 대신 사용.';
COMMENT ON COLUMN recon_master.plan_ratio IS '비례율(%). 조합원 종전자산 대비 종후자산 비율. 사업성 지표(100%+ 우수).';

-- 2) recon_docs: 단지별 문서 (정비계획 원문·조합공지 등, 단지당 여러 개)
CREATE TABLE IF NOT EXISTS recon_docs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id    VARCHAR(30),          -- recon_master.asset_id 연결
    ticker      VARCHAR(20),
    doc_type    VARCHAR(30),          -- 정비계획 / 조합공지 / 시공사자료 / 분석노트
    title       VARCHAR(200) NOT NULL,
    body        TEXT,                 -- 문서 본문(마크다운)
    source      VARCHAR(300),         -- 출처(고시번호·URL)
    doc_date    VARCHAR(20),          -- 문서 일자
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recon_docs_asset ON recon_docs(asset_id);

ALTER TABLE recon_docs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recon_docs admin all" ON recon_docs;
CREATE POLICY "recon_docs admin all" ON recon_docs FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE recon_docs IS '재건축 단지별 문서(정비계획·조합공지 등). 리서치 원천. 여기서 숫자 추출→recon_master 확정컬럼 반영.';

-- 3) 오금현대 정비계획 확정값 반영 (첫 사례)
--    현재 용적률도 정비계획 기준 200%로 정정 (기존 177%는 타 사이트값).
UPDATE recon_master SET
    far = 200,
    plan_confirmed = TRUE,
    plan_far = 360,
    plan_units_new = 2436,
    plan_units_rental = 407,
    plan_donation_rate = 0.102,
    plan_gfa_new = 397000,
    plan_bcr = 19.9,
    plan_ratio = 98.5,
    plan_source = '정비계획(획지1 제3종 299.9% / 획지2 준주거 424% / 통합평균 360%, 시공사 현대건설, 비례율 98~99%)',
    updated_at = NOW()
WHERE asset_id = 'SEL-SP-OGM-001';

-- 4) 오금현대 정비계획 문서 저장
INSERT INTO recon_docs (asset_id, ticker, doc_type, title, body, source, doc_date)
VALUES (
  'SEL-SP-OGM-001', 'OGHD', '정비계획', '오금현대아파트 재건축 종합 정리',
  E'## 현재 (재건축 전)\n- 위치: 서울 송파구 오금동 159번지\n- 준공: 1986년 / 21개 동, 1,316세대\n- 용적률: 약 200% / 연면적 약 156,000㎡ / 사업부지 110,232㎡\n\n## 미래 (재건축 후)\n- 지하4층~지상37층, 총 2,436세대 (임대 407, 16.7%)\n- 시공사: 현대건설\n- 획지1(제3종): 86,335㎡, 299.9% / 획지2(준주거): 12,615㎡, 424% / 통합평균 360%\n- 연면적 약 397,000㎡ (기존 대비 2.5배) / 건폐율 19.9%\n- 정비기반시설 11,282㎡\n\n## 공공기여\n- 기부채납 약 10.2% (공공보행통로·주민편의·공영주차장·녹지)\n- 임대 407세대 (16.7%)\n\n## 추정 분담금 (평형별)\n- 59㎡: 신축 ~11.7억, 약 3억 환급\n- 84㎡: 신축 ~15.4억, 6천만~8.4억 납부\n- 114㎡: 신축 ~18억, ~5,600만 납부\n- 170㎡: 신축 ~19.7억, 환급~납부 혼재\n- 198㎡: 신축 ~25.5억, ~6.3억 납부\n- 비례율 약 98~99% → 사업성 우수, 조합원 부담 적음\n\n## 종합\n- 세대 1,316→2,436, 연면적 156,000→397,000㎡ → 단지가치 2~3배 확대\n- 공공성(기부채납10.2%+임대16.7%)으로 행정 안정성 확보',
  '정비계획', '2026'
)
ON CONFLICT DO NOTHING;
