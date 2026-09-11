-- ============================================================
-- recon_master: 단지 상태(status) 컬럼 추가
-- 작성일: 2026-09-04
-- 목적: 단지 추가/보류/삭제 관리.
--   draft  = 작성 중(필드 미완성). 인덱스 계산·RVI·랭킹에서 제외.
--   active = 운영 중(기본값). 모든 화면 반영.
--   hold   = 보류. DB엔 있으나 RVI·랭킹에서 제외(나중에 복구 가능).
-- 삭제는 DB에서 영구 삭제(되돌릴 수 없음) → 웬만하면 hold 권장.
-- 재실행 안전: IF NOT EXISTS.
-- 사용자: Supabase SQL Editor에서 실행.
-- ============================================================

ALTER TABLE recon_master
  ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'active';

-- 기존 행은 전부 운영(active)로 (DEFAULT로 이미 채워지지만 명시)
UPDATE recon_master SET status = 'active' WHERE status IS NULL OR status = '';

COMMENT ON COLUMN recon_master.status IS '단지 상태: draft(작성중)/active(운영)/hold(보류). active만 RVI·랭킹 반영.';
