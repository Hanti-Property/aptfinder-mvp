#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NCMC (New Complex Market Cap) / RAR (Reconstruction Asset Ratio) 산출
설계 확정 2026-09-01 (aptfinder_rvi_ncmc_redesign_260901.md)
산식 개정 2026-09-01: 전용률·세대수 추정을 제거하고 "대지평당가 용적률 비례"로 단순화.

토지 기반 산식 (CMC와 완전 대칭):
  재건축후 대지평당가(landPppNew) = 현재 대지평당가 × (목표용적률 / 현재용적률) × (1 + 프리미엄률)
  NCMC = 재건축후 대지평당가 × 전체 토지평          (단위: 조원)
  RAR  = NCMC / CMC = landPppNew / landPppMarket = (목표용적률/현재용적률) × (1+프리미엄률)

핵심 아이디어:
  재건축으로 같은 땅에 건물을 (목표용적률/현재용적률)배 더 올릴 수 있으므로
  땅값(대지평당가)도 그 배수만큼 오른다. + 신축 프리미엄(헌집→새집).
  → 전용률·세대수·NVP 추정 불필요. 이미 데이터에 있는 현재 대지평당가만 사용.

목표용적률(targetFar) 결정 순서:
  1) 단지별 override 값이 있으면 그 값.
     - 은마 320% (관리처분 준비)
     - 개포6차우성 250% (현재 용적률 107%로 너무 낮아 300% 목표 시 RAR 과대 → 보수적으로 하향)
  2) 예외조항(고밀): 현재 용적률 >= 300% 이면 목표 = 현재용적률 × 1.20
     (이미 목표 300%를 초과하는 초고밀 단지가 RAR<1(수축)로 나오는 것 방지).
  3) 그 외에는 기본 300%.

정책:
  - 신축프리미엄(PREMIUM_RATE): 0.20 (전 단지 공통). 기존 NVP ×1.20과 개념 일치. 보수적.
  - NCMC/RAR은 미래 명목 규모 지표 → 할인 미적용 (인플레도 미반영, 실질 기준).

실행: python3 scripts/calc_ncmc.py
"""
import json, os

MASTER = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'complexes_master.json')
PY = 3.3058

# 목표용적률 override (정식 name 기준).
TARGET_FAR_OVERRIDE = {
    '은마아파트': 3.20,        # 관리처분 준비, 대치동 지구단위
    '개포6차우성아파트': 2.50,  # 현재 용적률 107% 과소 → 목표 250%로 보수적 하향
}
TARGET_FAR_BASE = 3.00           # 기본 목표용적률 (300%)
HIGH_FAR_THRESHOLD = 3.00        # 현재 용적률이 이 값(배수) 이상이면 고밀 예외조항 적용
HIGH_FAR_UPLIFT = 1.20           # 고밀 예외: 목표 = 현재용적률 × 1.20

# 신축 프리미엄 (전 단지 공통). 헌집→새집 프리미엄. 기존 NVP ×1.20과 개념 일치.
PREMIUM_RATE = 0.20


def target_far(name, cur_far):
    """목표용적률(배수) 결정. cur_far: 현재 용적률 배수(예: 2.04). 반환: (배수, 규칙명)."""
    if name in TARGET_FAR_OVERRIDE:
        return TARGET_FAR_OVERRIDE[name], 'override'
    if cur_far >= HIGH_FAR_THRESHOLD:
        return cur_far * HIGH_FAR_UPLIFT, 'high_far(현재×1.2)'
    return TARGET_FAR_BASE, 'base(300%)'


def main():
    d = json.load(open(MASTER, encoding='utf-8'))
    results = []
    for x in d:
        cmc = x.get('cmc')
        land_ppp_now = x.get('landPppMarket')
        cur_far_pct = x.get('far') or 0
        plat = x.get('platArea') or 0
        # 대상: CMC·현재 대지평당가·현재 용적률·대지면적이 있는 재건축 티커 단지
        if not (x.get('ticker') and cmc and land_ppp_now and cur_far_pct and plat):
            for k in ('targetFar', 'landPppNew', 'ncmc', 'rar', 'ncmcPremiumRate',
                      'targetFarRule', 'ncmcMethod', 'nvpNew', 'nvpPremiumRate'):
                x.pop(k, None)
            continue

        cur_far = cur_far_pct / 100.0
        ftar, rule = target_far(x['name'], cur_far)
        far_ratio = ftar / cur_far                       # 용적률 상승 배수
        rar = round(far_ratio * (1 + PREMIUM_RATE), 2)   # = landPppNew / landPppNow

        land_ppp_new = round(land_ppp_now * rar)         # 재건축후 대지평당가(만원/평)
        ncmc_jo = round(cmc * rar, 2)                    # NCMC = CMC × RAR (조)

        x['targetFar'] = round(ftar * 100)               # % (250, 300, 320, 443 ...)
        x['targetFarRule'] = rule
        x['ncmcPremiumRate'] = PREMIUM_RATE
        x['landPppNew'] = land_ppp_new
        x['ncmc'] = ncmc_jo
        x['rar'] = rar
        x['ncmcMethod'] = '현재대지평당가×(목표용적률/현재용적률)×(1+프리미엄0.2) (2026-09-01 개정)'
        # 구산식 잔여 필드 정리
        x.pop('nvpNew', None); x.pop('nvpPremiumRate', None)

        results.append((x['shortName'], x['dong'], cur_far_pct, x['targetFar'],
                        land_ppp_now, land_ppp_new, cmc, ncmc_jo, rar, rule))

    json.dump(d, open(MASTER, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    results.sort(key=lambda r: -r[8])
    print(f"대상 단지: {len(results)}개 (신축프리미엄 {PREMIUM_RATE:+.0%})\n")
    hdr = (f"{'단지':11s}{'동':7s}{'현용적':>6}{'목표':>5}{'현대지평당':>9}"
           f"{'후대지평당':>9}{'CMC':>6}{'NCMC':>7}{'RAR':>6}  규칙")
    print(hdr)
    print('-' * 82)
    for r in results:
        mark = ' ★' if r[9] != 'base(300%)' else ''
        print(f'{r[0]:11s}{r[1]:7s}{r[2]:>6.0f}{r[3]:>5}{r[4]:>9}{r[5]:>9}'
              f'{r[6]:>6}{r[7]:>7}{r[8]:>6}  {r[9]}{mark}')
    tot_cmc = sum(r[6] for r in results)
    tot_ncmc = sum(r[7] for r in results)
    n_high = sum(1 for r in results if r[9].startswith('high_far'))
    n_ovr = sum(1 for r in results if r[9] == 'override')
    n_low = sum(1 for r in results if r[8] < 1)
    print(f"\n합계 CMC {round(tot_cmc,1)}조 → NCMC {round(tot_ncmc,1)}조 "
          f"(전체평균 RAR {round(tot_ncmc/tot_cmc,2)}x)")
    print(f"규칙: override {n_ovr}개 | 고밀예외(현재용적률≥300%) {n_high}개 | RAR<1 {n_low}개")


if __name__ == '__main__':
    main()
