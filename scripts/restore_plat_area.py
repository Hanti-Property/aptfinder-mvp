#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
대지면적(platArea) 역산 복원 (옵션1)

원리: 기존 용적률 far는 vlRatEstmTotArea / platArea * 100 로 역산된 값이므로
      platArea = vlRatEstmTotArea / (far/100) 로 복원 가능.

- 이미 platArea가 있는 레코드(현대10차 수기추정 등)는 건드리지 않음
- vlRatEstmTotArea가 0이면 복원 불가 → 건너뜀
- 복원값에는 platAreaSource='역산복원(far×vlRatEstm)' 표시 → 추후 토지대장으로 정밀 대체
- 동적 필드는 손대지 않음

실행: python3 scripts/restore_plat_area.py
"""
import json, os

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
MASTER = os.path.join(BASE, 'complexes_master.json')

def main():
    m = json.load(open(MASTER, encoding='utf-8'))
    restored = 0
    skipped = []
    for x in m:
        if not x.get('ticker'):
            continue
        if x.get('platArea'):
            continue  # 이미 값 있음 (현대10차 추정 등) → 유지
        far = x.get('far') or 0
        vle = x.get('vlRatEstmTotArea') or 0
        if far > 0 and vle > 0:
            plat = round(vle / (far / 100.0), 1)
            x['platArea'] = plat
            x['platAreaSource'] = '역산복원(far×vlRatEstm)'
            x['platAreaEstimated'] = True  # 토지대장 정밀확보 전까지 추정 플래그
            restored += 1
        else:
            skipped.append((x['ticker'], x['shortName'], f'far={far}, vlRatEstm={vle}'))

    json.dump(m, open(MASTER, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"대지면적 역산복원: {restored}개")
    print(f"복원 불가(건너뜀): {len(skipped)}개")
    for tk, sn, why in skipped:
        print(f"  {tk} {sn} — {why}")


if __name__ == '__main__':
    main()
