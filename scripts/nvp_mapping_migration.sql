-- ============================================================
-- NVP 매핑 시스템 — recon_master 컬럼 추가
-- 작성일: 2026-09-01
-- 목적: 재건축 단지 ↔ NVP 레퍼런스(nvp_reference) 매핑.
--       최종 NVP = avg(매핑 ref들의 std_ppp_exclu) × (1 + 위치가중치)
--       단, 현재 전용평당가(avg_ppp) >= 조정 NVP 이면 상승여력 소진
--       → nvp_valid=false, 최종 NVP = 현재가(avg_ppp)로 대체.
--
-- 설계 확정 (2026-09-01):
--   (1) 현재가 >= NVP 처리 = (B) 현재가로 대체 + 플래그
--   (2) 비교 기준 = 오늘 NVP (ETA 상승률 적용 전, ref 신축 현재 실거래가)
--   (3) 신축 프리미엄 1.2 제거 (ref가 이미 신축 실거래라 이중 방지)
--
-- 재실행 안전: IF NOT EXISTS.
-- 사용자: Supabase SQL Editor에서 실행.
-- ============================================================

ALTER TABLE recon_master
  ADD COLUMN IF NOT EXISTS nvp_ref_codes  TEXT[],            -- 매핑된 NVP ref_code 목록 (nvp_reference.ref_code)
  ADD COLUMN IF NOT EXISTS nvp_loc_weight NUMERIC(4,3),      -- 위치 가중치 (예: 0.100=+10%, -0.100=-10%, 5% 단위)
  ADD COLUMN IF NOT EXISTS nvp_base       INTEGER,           -- 기초 NVP = avg(ref std_ppp_exclu)  [계산·읽기전용]
  ADD COLUMN IF NOT EXISTS nvp_final      INTEGER,           -- 최종 NVP (가중치·소진 반영)         [계산·읽기전용]
  ADD COLUMN IF NOT EXISTS nvp_valid      BOOLEAN;           -- 상승여력 유효(현재가<NVP)=true / 소진=false

COMMENT ON COLUMN recon_master.nvp_ref_codes  IS '매핑 NVP 레퍼런스 ref_code 배열. admin /admin/recon "NVP매핑" 탭에서 멀티선택.';
COMMENT ON COLUMN recon_master.nvp_loc_weight IS '위치 가중치. 5% 단위(-0.20~+0.20). 조정NVP = 기초NVP×(1+weight).';
COMMENT ON COLUMN recon_master.nvp_base       IS '기초NVP = 매핑 ref들의 std_ppp_exclu 단순평균(만원/전용평).';
COMMENT ON COLUMN recon_master.nvp_final      IS '최종NVP. 현재가<조정NVP면 조정NVP, 현재가>=조정NVP면 현재가(avg_ppp)로 대체.';
COMMENT ON COLUMN recon_master.nvp_valid      IS 'true=상승여력 유효(저평가), false=상승여력 소진(현재가가 이미 신축가 이상).';
