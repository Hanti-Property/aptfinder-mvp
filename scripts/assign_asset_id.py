#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Asset ID (자산 고유번호) 부여 — Asset Lineage

목적:
  티커/단지명은 재건축 등으로 바뀔 수 있지만, 자산(땅)의 고유번호는 영구 불변.
  예) 은마 A00001 → 재건축 완료 후 티커가 바뀌어도 A00001은 그대로 유지.
  이를 통해 "신축 단지의 전신이 어느 단지였는지" 계보를 추적한다.

형식: A + 5자리 (A00001~). 접두어 A = 강남구 (향후 서초 B, 송파 C 등 확장).
부여 기준: 세대수 내림차순 (은마=A00001, 미도=A00002 ...) — 대표 지정.
불변 원칙: 한번 부여된 assetId는 절대 변경하지 않는다. 신규 단지는 다음 번호 이어서.

실행: python3 scripts/assign_asset_id.py
"""
import json, os

TICKER=os.path.join(os.path.dirname(__file__),'..','public','data','gangnam_ticker_master.json')
MASTER=os.path.join(os.path.dirname(__file__),'..','public','data','complexes_master.json')
PREFIX='A'   # 강남구

def main():
    tk=json.load(open(TICKER,encoding='utf-8'))

    # 이미 부여된 것 보존, 미부여만 신규 채번
    existing={t['ticker']:t.get('assetId') for t in tk if t.get('assetId')}
    used_nums=sorted(int(a[1:]) for a in existing.values() if a and a[0]==PREFIX)
    next_num=(used_nums[-1]+1) if used_nums else 1

    # 세대수 내림차순으로 미부여 단지 정렬
    def hh(t):
        return t.get('household') or 0
    unassigned=[t for t in tk if not t.get('assetId')]
    unassigned.sort(key=lambda t:-hh(t))

    newly=[]
    for t in unassigned:
        aid=f"{PREFIX}{next_num:05d}"
        t['assetId']=aid
        newly.append((aid, t['ticker'], t['shortName'], hh(t)))
        next_num+=1

    json.dump(tk,open(TICKER,'w',encoding='utf-8'),ensure_ascii=False,indent=2)

    # complexes_master에도 지번키로 assetId 반영
    aid_by_key={ (t['bjdong'],t['jibun']):t['assetId'] for t in tk if t.get('assetId') }
    aid_by_ticker={ t['ticker']:t['assetId'] for t in tk if t.get('assetId') }
    m=json.load(open(MASTER,encoding='utf-8'))
    synced=0
    for x in m:
        if not x.get('ticker'): continue
        aid=aid_by_key.get((x.get('bjdong'),x.get('jibun'))) or aid_by_ticker.get(x.get('ticker'))
        if aid:
            x['assetId']=aid; synced+=1
    json.dump(m,open(MASTER,'w',encoding='utf-8'),ensure_ascii=False,indent=2)

    print(f"신규 채번: {len(newly)}개 (기존 유지: {len(existing)}개)")
    print(f"complexes_master 반영: {synced}개\n")
    for aid,tkr,sn,h in newly:
        print(f"  {aid}  {tkr:8} {sn:12} 세대 {h}")

if __name__=='__main__':
    main()
