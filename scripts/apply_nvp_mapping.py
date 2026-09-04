#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NVP 매핑 결과 병합 — Supabase(recon_master) → complexes_master.json

배경: 로컬에 .env(Supabase 키)가 없어 스크립트가 DB에 직접 접속 못 함.
      대신 admin /admin/recon "NVP매핑" 탭의 [매핑 내보내기(JSON)] 버튼으로
      nvp_mapping_export.json 을 받아 이 스크립트로 JSON에 병합한다.

병합 필드(티커 조인):
  nvpRefCodes, nvpLocWeight, nvpBase, nvpFinal, nvpValid
→ 이후 calc_ncmc.py 재실행 시 nvpFinal 을 기준 NVP로 사용(신축프리미엄 1.2 미적용).

입력 파일 위치 우선순위:
  1) 인자로 받은 경로            python3 scripts/apply_nvp_mapping.py <export.json>
  2) ~/Downloads/nvp_mapping_export.json
  3) public/data/nvp_mapping_export.json

실행 후: python3 scripts/calc_ncmc.py && python3 scripts/calc_flags.py
"""
import json, os, sys

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
MASTER = os.path.join(BASE, 'complexes_master.json')

CANDIDATES = [
    os.path.expanduser('~/Downloads/nvp_mapping_export.json'),
    os.path.join(BASE, 'nvp_mapping_export.json'),
]

MAP_FIELDS = ('nvpRefCodes', 'nvpLocWeight', 'nvpBase', 'nvpFinal', 'nvpValid')


def find_export():
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        return sys.argv[1]
    for p in CANDIDATES:
        if os.path.exists(p):
            return p
    return None


def main():
    src = find_export()
    if not src:
        print('❌ nvp_mapping_export.json 을 찾지 못함.')
        print('   admin /admin/recon > NVP매핑 탭 > [매핑 내보내기(JSON)] 후 재실행.')
        print('   또는: python3 scripts/apply_nvp_mapping.py <경로>')
        sys.exit(1)

    exp = json.load(open(src, encoding='utf-8'))
    by_ticker = {e['ticker']: e for e in exp if e.get('ticker')}
    master = json.load(open(MASTER, encoding='utf-8'))

    merged, cleared = 0, 0
    for x in master:
        tk = x.get('ticker')
        e = by_ticker.get(tk)
        if e and e.get('nvpFinal'):
            for f in MAP_FIELDS:
                x[f] = e.get(f)
            merged += 1
        else:
            # 매핑 없거나 ref 미선택 → 매핑 필드 제거(폴백=동별상수)
            had = any(f in x for f in MAP_FIELDS)
            for f in MAP_FIELDS:
                x.pop(f, None)
            if had:
                cleared += 1

    json.dump(master, open(MASTER, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'입력: {src}')
    print(f'매핑 병합: {merged}개 (nvpFinal 적용)')
    print(f'매핑 해제: {cleared}개 (폴백=동별상수×1.2)')
    print('→ 다음: python3 scripts/calc_ncmc.py && python3 scripts/calc_flags.py')

    # 요약 미리보기
    rows = [(x['shortName'], x.get('nvpFinal'), x.get('nvpValid'))
            for x in master if x.get('nvpFinal')]
    if rows:
        print('\n적용 단지:')
        for nm, fin, valid in rows:
            flag = '' if valid else ' ⚠️소진'
            print(f'  {nm:12s} nvpFinal={fin:>6,}{flag}')


if __name__ == '__main__':
    main()
