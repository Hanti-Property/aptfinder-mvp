#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CMC (Complex Market Cap) 산출 — R6-1 자산 시가총액 지수

정의 (대표 확정 2026-08-29):
  CMC = 세대 실거래가 × 세대수
      (= 대지 실거래 평당가 × 전체 토지평, 수학적으로 동일)
  대지 실거래 평당가(landPppMarket) = 세대 실거래가 / 세대 대지지분평
  세대 대지지분평 = (전체 토지면적㎡ / 3.3058) / 세대수

자산 규모 등급(capGrade): Mega(10조+)/Large(5~10조)/Mid(2~5조)/Small(<2조)
단위: 조원 (1조 = 1e8 만원)

※ 공시지가 기반 CMC는 사용하지 않음 (대표 결정).
실행: python3 scripts/calc_cmc.py
"""
import json, os
from collections import Counter

MASTER=os.path.join(os.path.dirname(__file__),'..','public','data','complexes_master.json')
TICKER=os.path.join(os.path.dirname(__file__),'..','public','data','gangnam_ticker_master.json')
PY=3.3058

def cap_grade(cmc_jo):
    if cmc_jo>=10: return 'Mega Cap'
    if cmc_jo>=5:  return 'Large Cap'
    if cmc_jo>=2:  return 'Mid Cap'
    return 'Small Cap'

def main():
    d=json.load(open(MASTER,encoding='utf-8'))
    tk=json.load(open(TICKER,encoding='utf-8'))
    tkmap={t['ticker']:t for t in tk}

    # (공시지가 관련 필드 제거 — 대표 결정으로 미사용)
    for x in d:
        for k in ('cmcOfficial','premiumPct','landPrice','landPriceYear'):
            x.pop(k, None)

    results=[]
    for x in d:
        if not x.get('ticker'): continue
        h=x.get('h') or 0
        plat=x.get('platArea') or 0
        unit_price=x.get('latestPrice') or 0  # 만원
        if not(h and plat and unit_price):
            x['cmc']=None
            continue
        plat_py=plat/PY
        land_share_py=plat_py/h
        land_ppp=unit_price/land_share_py      # 만원/평 (대지 실거래 평당가)
        cmc_jo=round(unit_price*h/1e8,2)       # 조원

        x['cmc']=cmc_jo
        x['landPppMarket']=round(land_ppp)
        x['capGrade']=cap_grade(cmc_jo)
        x['cmcMethod']='세대실거래가×세대수(=대지실거래평당가×토지평)'
        if x['ticker'] in tkmap:
            t=tkmap[x['ticker']]
            t['cmc']=cmc_jo; t['landPppMarket']=round(land_ppp); t['capGrade']=cap_grade(cmc_jo)
        results.append((x['ticker'],x['shortName'],cmc_jo,cap_grade(cmc_jo),round(land_ppp)))

    json.dump(d,open(MASTER,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
    json.dump(tk,open(TICKER,'w',encoding='utf-8'),ensure_ascii=False,indent=2)

    results.sort(key=lambda r:-(r[2] or 0))
    print(f"{'#':>3} {'티커':8}{'약칭':10}{'CMC(조)':>8}{'등급':>11}{'대지평당(만)':>12}")
    print('-'*54)
    for i,(tk_,sn,cmc,gr,lppm) in enumerate(results,1):
        print(f"{i:>3} {tk_:8}{sn:10}{cmc:>8.1f}{gr:>11}{lppm:>12,}")
    print('\n등급 분포:', dict(Counter(r[3] for r in results)))
    print('CMC 합계:', round(sum(r[2] for r in results),1), '조원 |', len(results), '개 단지')

if __name__=='__main__':
    main()
