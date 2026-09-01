#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tradeName 필드 설정 — 실거래(국토부) aptNm 부분일치 매칭 키워드.
근거: 2026-09-01 국토부 실거래 최근 12개월 aptNm 실측 (강남구 LAWD 11680).
      네이버부동산 지번·세대수로 교차검증.

목적: 마스터 정식명(name)과 실거래 aptNm 표기가 달라 실거래 매칭이 깨지는 문제 해결.
      tradeName 배열의 키워드 중 하나라도 실거래 aptNm에 '부분일치'하면 그 단지 거래로 인정.
      실거래명이 동번호까지 포함(예: '현대6차(78~81...동)')하므로 안정적 핵심어만 저장.

실행: python3 scripts/set_trade_name.py
"""
import json, os

MASTER = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'complexes_master.json')

# 티커 → tradeName 키워드 배열 (실거래 aptNm에 부분일치용)
TRADE_NAME = {
    'EM':        ['은마'],
    'MIDO':      ['한보미도맨션'],
    'GP6-7':     ['개포주공6단지', '개포주공7단지'],
    'SK':        ['선경1차', '선경2차'],          # 선경
    'GP5':       ['개포주공5단지'],
    'ILWS7':     ['우성7'],                        # 일원우성7
    'DCGPWS1':   ['개포우성1'],                    # 대치개포우성1
    'GPKNM':     ['경남1', '경남2'],               # 경남
    'DCSS1':     ['쌍용대치아파트1'],              # 대치쌍용1 (지번66, 실거래 '쌍용대치아파트1동,2동...')
    'DCWS1':     ['대치우성아파트'],               # 대치우성1
    'DCGPWS2':   ['개포우성2'],                    # 대치개포우성2
    'GPHD1':     ['현대1차101동'],                 # 개포현대1 (개포동 653)
    'GPWS3':     ['개포우성3차'],
    'DCSS2':     ['쌍용대치2'],
    'DGPHS':     ['한신(개포)'],                   # 도곡개포한신
    'GPWS6':     ['개포우성6', '우성6'],           # 최근 거래 없음 — 향후 대비
    'GPWS8':     ['우성8'],
    'GPHS':      ['개포한신'],                     # 개포한신 (일원동 615-1)
    'APMS1':     ['미성1차'],
    'APMS2':     ['미성2차'],
    'APNHD':     ['신현대9차'],                    # 압구정신현대 426번지 (신현대11차 433·12차 434 오탐 방지)
    'APHD1-2':   ['현대1차(', '현대2차('],         # 압구정현대1-2 (동번호 괄호로 개포현대1과 구분)
    'APHD3':     ['현대3차('],
    'APHD5':     ['현대5차('],
    'APHD6-7':   ['현대6차', '현대7차'],
    'APHD8':     ['현대8차'],
    'APHD13':    ['현대13차'],
    'APHD14':    ['현대14차'],
    'APHY1':     ['한양1차'],
    'APHY2':     ['한양2'],
    'APHY3':     ['한양3'],
    'APHY4':     ['한양4'],
    'APHY5':     ['한양5'],
    'APHY6':     ['한양6'],
    'APHY7':     ['한양7'],
    'APHD4':     ['현대4차'],
    'APHD10':    ['현대10', '현대10차'],           # 최근 거래 없음 — 향후 대비
    'GPHD3':     ['현대아파트3', '현대3'],          # 개포현대3 (개포동 177)
}


def main():
    d = json.load(open(MASTER, encoding='utf-8'))
    tk = {x.get('ticker'): x for x in d if x.get('ticker')}
    set_cnt, miss = 0, []
    for ticker, names in TRADE_NAME.items():
        if ticker in tk:
            tk[ticker]['tradeName'] = names
            set_cnt += 1
        else:
            miss.append(ticker)
    # 대상인데 매핑 누락된 재건축 티커 점검
    no_map = [x['shortName'] for x in d
              if x.get('ticker') and x.get('cmc') and x.get('lawd') == '11680'
              and 'tradeName' not in x]

    json.dump(d, open(MASTER, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'tradeName 설정: {set_cnt}개')
    if miss:
        print(f'매핑에 있으나 마스터에 없는 티커: {miss}')
    if no_map:
        print(f'⚠️ tradeName 누락된 재건축 단지: {no_map}')
    else:
        print('재건축 티커 단지 전부 tradeName 설정 완료')


if __name__ == '__main__':
    main()
