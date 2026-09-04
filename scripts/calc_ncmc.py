#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NCMC (New Complex Market Cap) / RAR (Reconstruction Asset Ratio) 산출
설계 확정 2026-09-01 (aptfinder_rvi_ncmc_redesign_260901.md)
산식 개정 v3 (2026-09-01): 재건축후 전용면적 × 입주시점(ETA) 신축 전용평당가.

기준 NVP 결정 (2026-09-01 매핑 시스템 도입):
  ┌ (우선) 매핑 NVP: nvpFinal 있으면 사용 = avg(매핑 ref 전용평당가)×(1+위치가중치),
  │        단 현재가≥조정NVP면 현재가로 대체(nvpValid=false, 상승여력 소진).
  │        ref가 이미 신축 실거래가 → 신축프리미엄 1.20 미적용(이중 방지).
  └ (폴백) 동별 상수 NVP: nvpFinal 없으면 NVP_V2_BASE[dong] × 1.20 (기존 방식).

산식:
  재건축후 전용평당가 = (매핑 nvpFinal | 동별NVP×1.20) × (1 + 상승률)^ETA
  재건축후 전용면적(평) = 대지면적 × 목표용적률 / 3.3058 × 전용률 × (1 - 기부채납)
  NCMC = 재건축후 전용면적 × 재건축후 전용평당가        (단위: 조원)
  RAR  = NCMC / CMC

설계 근거:
  - 대표 방침: 우리가 이미 예측하는 "입주시점(ETA) 신축가"를 근거로 단지 전체 시총 산출.
  - 늘어나는 면적 = 대지 × 목표용적률 (용적률 정의). 여기에 전용률·기부채납으로 실분양자산화.
  - "8년 후"가 아니라 단지별 ETA 연수 시점 가격을 적용((1+상승률)^ETA).
  - 특성 프리미엄(규모/학군/한강/대장)은 제거 → 보수적. 필요 단지만 향후 튜닝 버퍼로.

가정 (TBD — 정비계획 확정 시 구역별 대체):
  - 전용률 EXCLUSIVE_RATE = 0.75  (연면적 → 전용면적, 강남 신축 평균)
  - 기부채납 DONATION_RATE = 0.20  (보수적. 실제 15~20%, 정비계획 확정 전 가정)
  - 연상승률 ANNUAL_RATE = 0.03    (화면 RRI 기본 슬라이더값과 정합)
  - 신축프리미엄 NVP_PREMIUM = 1.20 (헌집→새집, 코드 상수와 정합)

목표용적률(targetFar) 결정 순서:
  1) 단지별 override (은마 320%, 개포6차우성 250%)
  2) 고밀 예외: 현재 용적률 >= 300% → 목표 = 현재용적률 × 1.20
  3) 그 외 → 기본 300%

실행: python3 scripts/calc_ncmc.py
"""
import json, os

MASTER = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'complexes_master.json')
PY = 3.3058

# 동별 기준 NVP (만원/전용평) — 대표 입력값 (재건축_RVI_개발현황_260823_v2.md)
NVP_V2_BASE = {
    '압구정동': 20000, '청담동': 17000, '대치동': 15000, '삼성동': 14000,
    '개포동': 13000, '도곡동': 13000, '일원동': 13000,
}
NVP_BASE_DEFAULT = 13000

# --- 가정 상수 (TBD) ---
NVP_PREMIUM = 1.20          # 신축 프리미엄 (헌집→새집)
ANNUAL_RATE = 0.03          # 연 상승률
EXCLUSIVE_RATE = 0.75       # 전용률 (연면적→전용)
DONATION_RATE = 0.20        # 기부채납 비율 (보수적)

# 목표용적률
TARGET_FAR_OVERRIDE = {
    '은마아파트': 3.20,        # 관리처분 준비, 대치동 지구단위
    '개포6차우성아파트': 2.50,  # 현재 용적률 107% 과소 → 목표 250% 하향
}
TARGET_FAR_BASE = 3.00
HIGH_FAR_THRESHOLD = 3.00    # 현재 용적률(배수) 이상이면 고밀 예외
HIGH_FAR_UPLIFT = 1.20


def target_far(name, cur_far):
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
        cur_far_pct = x.get('far') or 0
        plat = x.get('platArea') or 0
        if not (x.get('ticker') and cmc and cur_far_pct and plat):
            for k in ('targetFar', 'landPppNew', 'ncmc', 'rar', 'ncmcPremiumRate',
                      'targetFarRule', 'ncmcMethod', 'nvpNew', 'nvpPremiumRate',
                      'ncmcNvpBase', 'ncmcNewPpp'):
                x.pop(k, None)
            continue

        eta = x.get('eta') if x.get('eta') is not None else 10
        cur_far = cur_far_pct / 100.0
        ftar, rule = target_far(x['name'], cur_far)

        # 기준 NVP 결정: 매핑(nvpFinal) 우선, 없으면 동별상수×신축프리미엄
        nvp_final = x.get('nvpFinal')
        if nvp_final:
            base = nvp_final                       # 이미 신축 실거래 기반 → 프리미엄 미적용
            nvp_src = 'mapped'
        else:
            base = NVP_V2_BASE.get(x['dong'], NVP_BASE_DEFAULT) * NVP_PREMIUM  # 폴백: 동별상수×1.2
            nvp_src = 'dong_const'
        new_ppp = base * ((1 + ANNUAL_RATE) ** eta)  # 재건축후 전용평당가(만원/평)

        gfa_py = plat * ftar / PY                                  # 재건축후 연면적(평)
        exclu_py = gfa_py * EXCLUSIVE_RATE * (1 - DONATION_RATE)   # 실분양 전용면적(평)
        ncmc_jo = round(exclu_py * new_ppp / 1e8, 2)               # 조
        rar = round(ncmc_jo / cmc, 2)

        x['targetFar'] = round(ftar * 100)
        x['targetFarRule'] = rule
        x['ncmcNvpBase'] = round(base)                             # 실제 사용한 기준 NVP (만원/전용평)
        x['ncmcNvpSource'] = nvp_src                               # mapped | dong_const
        x['ncmcNewPpp'] = round(new_ppp)                           # 재건축후 전용평당가
        x['ncmc'] = ncmc_jo
        x['rar'] = rar
        if nvp_src == 'mapped':
            x['ncmcMethod'] = ('재건축후전용면적(대지×목표용적률×전용률0.75×(1-기부채납0.2)) '
                               '× 입주시점전용평당가(매핑NVP×(1+3%)^ETA) '
                               '[v4 2026-09-01 매핑NVP, 신축프리미엄 미적용]')
        else:
            x['ncmcMethod'] = ('재건축후전용면적(대지×목표용적률×전용률0.75×(1-기부채납0.2)) '
                               '× 입주시점전용평당가(동별NVP×1.2×(1+3%)^ETA) '
                               '[v3 2026-09-01, 매핑전 폴백, TBD가정]')
        # 구산식 잔여 필드 정리
        for k in ('landPppNew', 'ncmcPremiumRate', 'nvpNew', 'nvpPremiumRate'):
            x.pop(k, None)

        results.append((x['shortName'], x['dong'], eta, x['targetFar'],
                        round(base), round(new_ppp), cmc, ncmc_jo, rar, rule, nvp_src))

    json.dump(d, open(MASTER, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    results.sort(key=lambda r: -r[8])
    print(f"대상 {len(results)}개 | 전용률{EXCLUSIVE_RATE} 기부채납{DONATION_RATE} "
          f"신축×{NVP_PREMIUM} 상승{ANNUAL_RATE:.0%} (TBD 가정)\n")
    hdr = (f"{'단지':11s}{'동':7s}{'ETA':>4}{'목표':>5}{'기준NVP':>7}"
           f"{'후전용평당':>9}{'CMC':>6}{'NCMC':>7}{'RAR':>6} src  규칙")
    print(hdr); print('-' * 90)
    for r in results:
        mark = ' ★' if r[9] != 'base(300%)' else ''
        src = 'MAP' if r[10] == 'mapped' else '동상수'
        print(f'{r[0]:11s}{r[1]:7s}{r[2]:>4}{r[3]:>5}{r[4]:>7}{r[5]:>9}'
              f'{r[6]:>6}{r[7]:>7}{r[8]:>6} {src:>4}  {r[9]}{mark}')
    n_map = sum(1 for r in results if r[10] == 'mapped')
    print(f"\n매핑NVP 적용: {n_map}개 / 동별상수 폴백: {len(results) - n_map}개")
    tc = sum(r[6] for r in results); tn = sum(r[7] for r in results)
    print(f"\n합계 CMC {round(tc,1)}조 → NCMC {round(tn,1)}조 (평균 RAR {round(tn/tc,2)}x)")
    n_low = sum(1 for r in results if r[8] < 1)
    print(f"RAR<1: {n_low}개")


if __name__ == '__main__':
    main()
