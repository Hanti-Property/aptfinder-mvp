-- ============================================================
-- NVP 레퍼런스 DB (신축 벤치마크 단지) — Supabase 테이블
-- 작성일: 2026-09-01
-- 용도: 재건축 단지의 NVP(재건축후 예상 신축가) 산출 기준이 되는 실제 신축 단지.
--       admin 화면(/admin/nvp)에서 CRUD + 실거래 표준가 자동 갱신.
-- 표준가 기준: 전용 84㎡(없으면 최근접 면적 환산), 최근 12개월 실거래, 이상치 제거 평균.
-- ============================================================

CREATE TABLE IF NOT EXISTS nvp_reference (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 식별 (정적)
    ref_code        VARCHAR(40) UNIQUE NOT NULL,   -- SEL-{구}-{동}-{순번}-NVP (자산번호 형식 + NVP 태그). 영구불변
    ticker          VARCHAR(20),                    -- 티커
    name            VARCHAR(100) NOT NULL,          -- 정식 단지명
    short_name      VARCHAR(50),                    -- 약칭
    trade_name      TEXT[],                         -- 국토부 실거래 aptNm 매칭 키워드(부분일치)

    -- 위치 (정적)
    gu              VARCHAR(20) NOT NULL,           -- 구
    dong            VARCHAR(30) NOT NULL,           -- 법정동
    jibun           VARCHAR(20),                    -- 지번
    bjdong          VARCHAR(10),                    -- 법정동코드
    lawd            VARCHAR(10),                    -- 시군구코드
    lat             DECIMAL(10,7),
    lng             DECIMAL(10,7),
    belt            VARCHAR(30),                    -- 권역 태그(예: 한강벨트)

    -- 단지 제원 (정적)
    built_year      INTEGER,                        -- 준공년도
    households      INTEGER,                        -- 세대수

    -- 실거래 표준가 (동적 — 실거래 조회로 갱신)
    std_ppp_exclu   INTEGER,                        -- 전용평당가(만원/평), 84㎡ 기준
    std_price_m2    INTEGER,                        -- ㎡당 가격(만원/㎡)
    std_area        DECIMAL(6,2),                   -- 표준가 산출에 쓴 전용면적(㎡)
    trade_count     INTEGER,                        -- 산출 거래건수
    latest_date     VARCHAR(10),                    -- 최근 거래(YYYY.MM)
    price_updated   TIMESTAMPTZ,                    -- 표준가 갱신 시각

    ref_status      VARCHAR(10) DEFAULT 'pending',  -- active(표준가 확보) / pending(거래부족)
    note            TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nvp_ref_gu ON nvp_reference(gu);
CREATE INDEX IF NOT EXISTS idx_nvp_ref_built ON nvp_reference(built_year);

COMMENT ON TABLE nvp_reference IS 'NVP 신축 벤치마크 단지. 재건축 NVP 산출 기준. 준공 15년 이내 신축만.';
