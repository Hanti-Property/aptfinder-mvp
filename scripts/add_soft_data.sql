-- ============================================================
-- recon_master: 소프트 데이터 컬럼 추가 (리서치팀 정성 자산)
-- 작성일: 2026-09-05
-- 목적: 단지별 정성 특성·리서치 메모를 축적 → 투자노트에 자동 반영.
--   features      : 특성 태그 배열 (한강변·학군·학원가·역세권·대장주·초대형·조망·상권 등)
--   research_memo : 리서치팀 자유 메모 (투자노트에 인용)
-- 재실행 안전: IF NOT EXISTS.
-- 사용자: Supabase SQL Editor에서 실행.
-- ============================================================

ALTER TABLE recon_master
  ADD COLUMN IF NOT EXISTS features      TEXT[],
  ADD COLUMN IF NOT EXISTS research_memo TEXT;

COMMENT ON COLUMN recon_master.features      IS '정성 특성 태그(한강변·학군·학원가·역세권·대장주·초대형·조망·상권 등). 투자노트 반영.';
COMMENT ON COLUMN recon_master.research_memo IS '리서치팀 자유 메모. 투자노트에 인용.';
