-- ============================================================
-- 재건축 단지 마스터 — Supabase 테이블 (recon_master)
-- 작성일: 2026-09-01
-- 대상: 강남구 재건축 티커 단지 38개 (확장 가능)
-- 용도: admin 화면(/admin/recon)에서 운영값 편집 + 실거래/인덱스 관리.
--       편집 후 JSON 내보내기로 complexes_master.json 갱신 → RVI 터미널 반영.
-- 필드 성격: [식별/운영=수기편집] [원천=건축물대장/실거래] [계산=스크립트 산출, 읽기전용]
-- ============================================================

CREATE TABLE IF NOT EXISTS recon_master (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- === 식별 (정적) ===
    asset_id        VARCHAR(30) UNIQUE,             -- 자산번호 SEL-GN-DCH-001 (영구불변)
    ticker          VARCHAR(20),                    -- 티커
    name            VARCHAR(100) NOT NULL,          -- 정식 단지명
    short_name      VARCHAR(50),                    -- 약칭
    trade_name      TEXT[],                         -- 실거래 aptNm 매칭 키워드
    gu              VARCHAR(20),
    dong            VARCHAR(30),
    jibun           VARCHAR(20),
    bjdong          VARCHAR(10),
    lawd            VARCHAR(10),

    -- === 운영값 (수기 편집 — 운영자가 관리) ===
    stage           INTEGER,                        -- 재건축 단계코드(3추진위~9입주)
    builder         VARCHAR(100),                   -- 시공사
    eta             DECIMAL(4,1),                   -- 입주까지 예상기간(년)
    rdt             DECIMAL(4,1),                   -- 리스크지연시간(년)
    move_in         INTEGER,                        -- 예상 입주년도
    risk            TEXT,                           -- 리스크/비고 메모
    eta_provisional BOOLEAN DEFAULT FALSE,          -- ETA 잠정 여부
    eta_source      VARCHAR(50),
    target_far      INTEGER,                        -- 재건축 목표 용적률(%) — NCMC 산정
    target_far_rule VARCHAR(30),

    -- === 원천 데이터 (건축물대장/토지대장 — 조회·보정) ===
    households      INTEGER,                        -- 세대수 (h/hhldCnt)
    far             DECIMAL(6,2),                   -- 현재 용적률(%)
    far_source      VARCHAR(40),
    far_tbd         BOOLEAN DEFAULT FALSE,
    plat_area       DECIMAL(12,2),                  -- 대지면적(㎡)
    plat_area_source VARCHAR(40),
    plat_area_estimated BOOLEAN DEFAULT FALSE,
    tot_area        DECIMAL(12,2),                  -- 연면적(㎡)
    vlrat_estm_area DECIMAL(12,2),                  -- 용적률산정연면적(㎡)

    -- === 실거래·시세 (실거래 조회로 갱신) ===
    avg_ppp         INTEGER,                        -- 평균 평당가(만원)
    latest_price    INTEGER,                        -- 최근 실거래가(만원)
    latest_area     DECIMAL(6,2),
    latest_exclu_py DECIMAL(6,2),
    latest_floor    INTEGER,
    latest_date     VARCHAR(10),                    -- 최근 거래 YYYY.MM
    latest_months_ago INTEGER,
    trade_count     INTEGER,
    price_updated   VARCHAR(20),

    -- === 계산값 (스크립트 산출 — 읽기전용 표시) ===
    cmc             DECIMAL(8,2),                   -- 현재 시총(조)
    land_ppp_market INTEGER,                        -- 현재 대지평당가(만원/평)
    cap_grade       VARCHAR(20),                    -- 자산규모등급
    ncmc            DECIMAL(8,2),                   -- 재건축후 시총(조)
    ncmc_new_ppp    INTEGER,                        -- 재건축후 전용평당가
    ncmc_nvp_base   INTEGER,                        -- NVP 기준가
    rar             DECIMAL(6,2),                   -- 성장배수
    -- 신뢰도 플래그
    size_grade      VARCHAR(4),                     -- xs/s/m/l/xl
    trade_reliability VARCHAR(6),                   -- low/mid/high
    nvp_gap_rate    DECIMAL(6,1),                   -- NVP 괴리율(%)
    warn_distortion BOOLEAN DEFAULT FALSE,          -- 왜곡주의

    -- === 메타 ===
    type            VARCHAR(20) DEFAULT 'reconstruction',
    recon_source    VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recon_ticker ON recon_master(ticker);
CREATE INDEX IF NOT EXISTS idx_recon_stage ON recon_master(stage);

-- RLS: 관리자(로그인) 전용
ALTER TABLE recon_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recon admin all" ON recon_master FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE recon_master IS '강남 재건축 단지 마스터. admin 편집 + JSON 내보내기로 RVI 터미널 연동. 인덱스(CMC/NCMC/RAR/RVI) 산출의 핵심 입력.';
