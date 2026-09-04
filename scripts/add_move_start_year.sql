-- ============================================================
-- recon_master: 예상 이주개시일(연도) 컬럼 추가
-- 작성일: 2026-09-04
-- 목적: 이주 개시 예상 연도. 투자자 관심 정보.
--       입력 시 화면 표시, 미입력 시 'TBA'.
-- 재실행 안전: IF NOT EXISTS.
-- 사용자: Supabase SQL Editor에서 실행.
-- ============================================================

ALTER TABLE recon_master
  ADD COLUMN IF NOT EXISTS move_start_year INTEGER;   -- 예상 이주개시 연도 (예: 2029). NULL이면 TBA.

COMMENT ON COLUMN recon_master.move_start_year IS '예상 이주개시 연도. 대표 수기 입력. NULL이면 화면에 TBA 표시.';
