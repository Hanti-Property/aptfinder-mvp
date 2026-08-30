#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Asset ID (자산 고유번호) 부여 — Asset Lineage / 계층형 지역 코드

형식: 시도(3) - 구(2) - 동(3) - 순번(3)   예) SEL-GN-DCH-001 (서울 강남구 대치동 1번)
  - 시도: 서울 SEL / 경기 GGI / 인천 ICN ...
  - 구:   강남 GN / (확장 시 서초 SC / 송파 SP ...)
  - 동:   압구정 APG / 대치 DCH / 개포 GPO / 일원 ILW / 도곡 DGK
  - 순번: 동 내 세대수 내림차순 001~

원칙 (Asset Lineage):
  - assetId는 최초 부여 시점 기준으로 **영구 불변**. 재건축·행정구역 변경에도 유지.
  - 현재 실제 위치는 sido/gu/dong 필드가 관리(가변). assetId 헤더는 '태어난 곳'.
  - 이미 assetId가 있으면 재사용/변경하지 않고, 미부여 단지만 신규 채번.

실행: python3 scripts/assign_asset_id.py
"""
import json, os
from collections import defaultdict

TICKER=os.path.join(os.path.dirname(__file__),'..','public','data','gangnam_ticker_master.json')
MASTER=os.path.join(os.path.dirname(__file__),'..','public','data','complexes_master.json')

SIDO_CODE={'서울':'SEL','경기':'GGI','인천':'ICN'}
GU_CODE={'강남구':'GN','서초구':'SC','송파구':'SP'}
DONG_CODE={
  '압구정동':'APG','대치동':'DCH','개포동':'GPO','일원동':'ILW','도곡동':'DGK',
  '청담동':'CDM','논현동':'NHN','삼성동':'SSD','수서동':'SSU',
}
DEFAULT_SIDO='서울'  # 강남구는 서울 소속

def region_prefix(gu, dong):
    sido=SIDO_CODE.get(DEFAULT_SIDO,'SEL')
    g=GU_CODE.get(gu,'XX')
    d=DONG_CODE.get(dong,'XXX')
    return f"{sido}-{g}-{d}"

def main():
    tk=json.load(open(TICKER,encoding='utf-8'))

    # 미부여만 대상 (기존 assetId는 불변 보존)
    unassigned=[t for t in tk if not t.get('assetId')]
    # 동 내 세대수 내림차순
    unassigned.sort(key=lambda t:(t['dong'], -(t.get('household') or 0)))

    # 접두어별 현재 최대 순번 파악 (기존 assetId 반영)
    seq=defaultdict(int)
    for t in tk:
        aid=t.get('assetId')
        if aid and aid.count('-')==3:
            pfx=aid.rsplit('-',1)[0]; n=int(aid.rsplit('-',1)[1])
            seq[pfx]=max(seq[pfx],n)

    newly=[]
    # 동별로 세대수순 채번
    by_dong=defaultdict(list)
    for t in unassigned:
        by_dong[t['dong']].append(t)
    for dong in by_dong:
        for t in sorted(by_dong[dong], key=lambda x:-(x.get('household') or 0)):
            pfx=region_prefix(t['gu'], t['dong'])
            seq[pfx]+=1
            aid=f"{pfx}-{seq[pfx]:03d}"
            t['assetId']=aid
            newly.append((aid,t['ticker'],t['shortName'],t.get('household') or 0))

    json.dump(tk,open(TICKER,'w',encoding='utf-8'),ensure_ascii=False,indent=2)

    # complexes_master 반영
    aid_by_key={(t['bjdong'],t['jibun']):t['assetId'] for t in tk if t.get('assetId')}
    m=json.load(open(MASTER,encoding='utf-8'))
    synced=0
    for x in m:
        if not x.get('ticker'): continue
        aid=aid_by_key.get((x.get('bjdong'),x.get('jibun')))
        if aid: x['assetId']=aid; synced+=1
    json.dump(m,open(MASTER,'w',encoding='utf-8'),ensure_ascii=False,indent=2)

    print(f"신규 채번 {len(newly)}개 / complexes_master 반영 {synced}개\n")
    for aid,tkr,sn,h in sorted(newly):
        print(f"  {aid}  {tkr:8} {sn:12} 세대 {h}")

if __name__=='__main__':
    main()
