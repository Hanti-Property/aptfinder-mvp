#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NCMC (New Complex Market Cap) / RAR (Reconstruction Asset Ratio) 산출
설계 확정 2026-09-01 (aptfinder_rvi_ncmc_redesign_260901.md)

토지 기반 산식 (CMC와 대칭):
  재건축후 토지평당가(landPppNew) = NVP × 목표용적률 × (1 + 프리미엄률)
  NCMC = 재건축후 토지평당가 × 전체 토지평            (단위: 조원, 1조=1e8 만원)
  RAR  = NCMC / CMC = landPppNew / landPppMarket

정책:
  - NVP: 동별 신축 전용평당가 상수 × NVP_PREMIUM(1.20). (코드 NVP_CAP 기준)
  - 목표용적률(targetFar): 기본 300%, 단지별 override (은마 320%, 압구정 300%).
  - 프리미엄률(nvpPremium): 현재 0%. 향후 지역별 도입.
  - NCMC/RAR은 미래 명목 규모 지표 → 할인 미적용 (인플레도 미반영, 실질 기준).

실행: python3 scripts/calc_ncmc.py
"""
import json, os

MASTER = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'complexes_master.json')
PY = 3.3058

# 동별 신축 전용평당가 (만원/평) — 코드 _internal_rvi.html NVP_CAP 기준
NVP_BASE = {
    '압구정동': 23000, '청담동': 23000, '대치동': 18000,
    '개포동': 15000, '도곡동': 15000, '일원동': 15000,
    '논현동': 15000, '삼성동': 15000,
}
NVP_DEFAULT = 15000
NVP_PREMIUM = 1.20   # 신축 프리미엄 (코드 상수와 정합)

# 목표용적률 override (단지명 기준). 기본 3.00.
TARGET_FAR_DEFAULT = 3.00
TARGET_FAR_OVERRIDE = {
    '은마아파트': 3.20,   # 관리처분 준비, 대치동 지구단위
    # 압구정 단지는 단계 일러 기본값(3.00) 유지 — override 없음
}

# 지역별 프리미엄률 (현재 전부 0%). 향후 한강조망/대장주 등 도입.
NVP_PREMIUM_RATE = {}   # 예: {'압구정동': 0.15}
PREMIUM_RATE_DEFAULT = 0.0


def target_far(name):
    return TARGET_FAR_OVERRIDE.get(name, TARGET_FAR_DEFAULT)


def premium_rate(dong):
    return NVP_PREMIUM_RATE.get(dong, PREMIUM_RATE_DEFAULT)


def main():
    d = json.load(open(MASTER, encoding='utf-8'))
    results = []
    for x in d:
        # 대상: CMC·토지평당가·대지면적이 있는 재건축 티커 단지
        cmc = x.get('cmc')
        land_ppp_now = x.get('landPppMarket')
        plat = x.get('platArea') or 0
        if not (x.get('ticker') and cmc and land_ppp_now and plat):
            # 대상 아님: 잔여 NCMC 필드 정리
            for k in ('targetFar', 'nvpNew', 'landPppNew', 'ncmc', 'rar', 'nvpPremiumRate', 'ncmcMethod'):
                x.pop(k, None)
            continue

        dong = x.get('dong', '')
        nvp = NVP_BASE.get(dong, NVP_DEFAULT) * NVP_PREMIUM   # 신축 전용평당가(프리미엄 포함)
        ftar = target_far(x['name'])
        prem = premium_rate(dong)

        land_ppp_new = nvp * ftar * (1 + prem)                # 재건축후 토지평당가(만원/평)
        plat_py = plat / PY
        ncmc_jo = round(land_ppp_new * 10000 * plat_py / 1e12, 2)  # 만원×평 → 원 → 조
        rar = round(land_ppp_new / land_ppp_now, 2)

        x['targetFar'] = round(ftar * 100)          # % 표기 (300, 320 ...)
        x['nvpNew'] = round(nvp)                     # 적용 신축 전용평당가
        x['nvpPremiumRate'] = prem                   # 지역 프리미엄률 (현재 0)
        x['landPppNew'] = round(land_ppp_new)        # 재건축후 토지평당가
        x['ncmc'] = ncmc_jo                          # 재건축후 시총(조)
        x['rar'] = rar                               # 성장배수
        x['ncmcMethod'] = 'NVP×목표용적률×(1+프리미엄)×토지평 (토지기반, 2026-09-01)'
        results.append((x['shortName'], dong, x.get('stage'), x['targetFar'],
                        land_ppp_now, x['landPppNew'], cmc, ncmc_jo, rar))

    json.dump(d, open(MASTER, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    results.sort(key=lambda r: -r[8])
    print(f"대상 단지: {len(results)}개\n")
    hdr = f"{'단지':10s}{'동':7s}{'단계':>3}{'용적%':>5}{'현재토지평당':>10}{'후토지평당':>9}{'CMC':>6}{'NCMC':>7}{'RAR':>6}"
    print(hdr)
    print('-' * len(hdr))
    for r in results:
        print(f'{r[0]:10s}{r[1]:7s}{str(r[2]):>3}{r[3]:>5}{r[4]:>10}{r[5]:>9}{r[6]:>6}{r[7]:>7}{r[8]:>6}')
    tot_cmc = sum(r[6] for r in results)
    tot_ncmc = sum(r[7] for r in results)
    print(f"\n합계 CMC {round(tot_cmc,1)}조 → NCMC {round(tot_ncmc,1)}조 "
          f"(전체 RAR {round(tot_ncmc/tot_cmc,2)}x)")


if __name__ == '__main__':
    main()
