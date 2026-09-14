---
inclusion: always
---

# 계산·데이터 일원화 규칙 (Single Source of Truth)

aptFinder의 모든 변수·인덱스·계산은 **한 곳에서만** 정의·실행한다. 로컬(브라우저) 중복 계산을 금지하고, 서버 엔진과 마스터 데이터로 일원화한다. 이 규칙은 서비스 오픈·확장의 핵심 전제다.

## 3층 구조 (각 층의 유일한 책임)

| 층 | 위치 | 책임 | 예 |
|---|---|---|---|
| **데이터(값)** | Supabase `recon_master` 등 | 단지별 실측·확정값 | far, plan_far, plan_contrib_84, built_year, avg_ppp |
| **계산(엔진)** | `lib/indexCalc.ts` (TS 단일 엔진) | 모든 파생 인덱스 산출 | CMC, NCMC, RAR, RVI, FAER, 분담금 보간 |
| **상수(계수)** | `lib/indexCalc.ts`의 `CONSTANTS`/테이블 | 산식에 쓰는 고정 계수 | 전용률 0.75, 상승률 3%, 동별 NVP, 보간 샘플, 지역등급 |

- **표시(화면)** 층은 계산하지 않는다. 값을 받아서 보여주기만 한다.

## 절대 규칙

### 규칙 1 — 계산은 `lib/indexCalc.ts`에서만
- 모든 인덱스/파생값은 indexCalc.ts에서 계산한다.
- HTML(`public/_internal_rvi.html` 등)·페이지 컴포넌트는 **계산 금지, 표시만**.
- 화면이 값을 얻는 경로: `page.tsx`가 indexCalc로 계산 → iframe/props로 주입 → HTML은 받은 값 렌더.

### 규칙 2 — 상수·계수는 한 곳에
- 동별 기준가·지역등급·프리미엄·보간 샘플·시간계수 등은 `CONSTANTS` 또는 Supabase 테이블에만.
- HTML/컴포넌트에 계수 하드코딩 금지. 같은 계수를 두 곳에 두지 않는다(중복=버그원).

### 규칙 3 — 단지별 값은 Supabase 마스터
- 단지마다 다른 값(용적률·세대·정비계획·준공연도 등)은 recon_master에 저장.
- 코드에 단지별 값을 하드코딩하지 않는다. 검수한 실측값을 마스터에 우선 저장(정비계획 파이프라인).

### 규칙 4 — 새 변수/인덱스가 나오면 즉시 보고
- 새 계산·상수·변수를 만들 때마다 **어느 층에 두는지 명시**하고 대표에게 보고한다.
- **로컬(브라우저)에서 계산·하드코딩하게 되는 경우 반드시 즉시 알린다.** 예외적으로 로컬이 불가피하면 사유와 이전 계획을 함께 보고.
- 새 코드는 처음부터 이 규칙대로 배치한다(로컬 계산 신규 생성 금지).

## 현재 위반 현황 (점진 이전 대상 — TODO)

아래는 HTML(`_internal_rvi.html`)에 남아있는 로컬 계산/상수. 새 작업 시 건드리게 되면 indexCalc로 이전한다. 한 번에 옮기지 않고 점진 이전(리팩터링 리스크·검증 부담 관리).

- **RVI 점수화 중복**: `sNVP·sFAR·sTLA·sAGE·sLPS·sNRT` — indexCalc에도 존재. 두 곳 관리 = 어긋남 위험.
- **NVP 이중 계산**: HTML `calcNvpV2`·`NVP_V2_BASE`·`NVP_CAP`·`NVP_PREMIUM` vs indexCalc의 NVP 로직.
- **분담금/회귀**: `interpolateCost`·`interpolateContrib84`·`CONTRIB84_SAMPLES`·`COST_SAMPLES`·`regress84Ppp`.
- **RRI·CAGR**: HTML `updateRRI` 내 로컬 계산.
- **지역등급 이중**: HTML `LOC_G`·`LOC_GRADES` (두 개가 따로).
- **특성 데이터**: `COMPLEX_FEATURES`·`HAN_RIVER_BELT`·`getComplexFeatures`.

## 검증
- 계산 변경 시 `verify_indexcalc.ts`로 검증(불변 필드 회귀 + 신규 산식 케이스).
- 파이썬 엔진은 유물 보존, **TS(indexCalc.ts)가 단일 운영 엔진**.
