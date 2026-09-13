-- ============================================================
-- 정비계획 확정값 컬럼 확장 v2
-- 작성일: 2026-09-13
-- 목적: 리서치에서 나오는 정비계획 정량정보를 마스터에 저장.
--   - 현재 연면적(재건축 전) → 증가배수 계산
--   - 84형→84형 대표 분담금 (국민평형, 투자노트 직접 인용)
--   - 평형별 분담금 표 전체 (jsonb, 표시·참고용)
--   - 정비기반시설 면적 / 최고 층수
-- (builder 시공사 컬럼은 기존에 존재 — 재사용)
-- 재실행 안전: IF NOT EXISTS.
-- Supabase SQL Editor에서 실행.
-- ============================================================

ALTER TABLE recon_master
  ADD COLUMN IF NOT EXISTS gfa_current      NUMERIC(12,1),   -- 현재(재건축 전) 연면적(㎡)
  ADD COLUMN IF NOT EXISTS plan_contrib_84  NUMERIC(6,2),    -- 84형→84형 분담금(억). 음수=환급, 양수=납부
  ADD COLUMN IF NOT EXISTS plan_contribution JSONB,          -- 평형별 분담금 표 [{area, newPrice, contribution, note}]
  ADD COLUMN IF NOT EXISTS plan_infra_area  NUMERIC(12,1),   -- 정비기반시설 면적(㎡)
  ADD COLUMN IF NOT EXISTS plan_max_floor   INTEGER;         -- 최고 층수

COMMENT ON COLUMN recon_master.gfa_current IS '현재(재건축 전) 연면적(㎡). plan_gfa_new와 비교해 연면적 증가배수 산출.';
COMMENT ON COLUMN recon_master.plan_contrib_84 IS '84㎡→84㎡ 대표 분담금(억원). 음수=환급, 양수=납부. 국민평형 기준 투자노트 인용.';
COMMENT ON COLUMN recon_master.plan_contribution IS '평형별 분담금 표(jsonb). [{area:59, newPrice:11.7, contribution:-3, note:"환급"}]. 표시·참고용.';
COMMENT ON COLUMN recon_master.plan_infra_area IS '정비기반시설 면적(㎡). 도로·공원·녹지·공공공지 등 기부채납 근거.';
COMMENT ON COLUMN recon_master.plan_max_floor IS '재건축 후 최고 층수. 랜드마크성·조망 지표.';

-- 오금현대 정비계획 정량정보 반영 (첫 사례 보강)
UPDATE recon_master SET
    gfa_current      = 156000,
    plan_infra_area  = 11282,
    plan_max_floor   = 37,
    builder          = COALESCE(builder, '현대건설'),
    plan_contrib_84  = 4.5,   -- 문서 "6천만~8.4억 납부" 중앙값(참고) — 확정값 확인 후 조정
    plan_contribution = '[
      {"area":59,  "newPrice":11.7, "contribution":-3.0, "note":"환급"},
      {"area":84,  "newPrice":15.4, "contribution":4.5,  "note":"6천만~8.4억 납부(중앙값)"},
      {"area":114, "newPrice":18.0, "contribution":0.56, "note":"약 5,600만 납부"},
      {"area":170, "newPrice":19.7, "contribution":null, "note":"환급~납부 혼재"},
      {"area":198, "newPrice":25.5, "contribution":6.3,  "note":"약 6.3억 납부"}
    ]'::jsonb,
    updated_at = NOW()
WHERE asset_id = 'SEL-SP-OGM-001';
