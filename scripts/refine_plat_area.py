#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
대지면적 다필지 합산 정밀화 — 38개 티커 단지

방식:
  각 단지 대표 지번의 본번(bun) + 부번(0~N)을 토지대장(V-World)으로 조회하여,
  지목이 '대'인 필지들의 대지면적을 합산 → 실측 대지면적 확보.
  (기존값은 대표지번 단독 역산복원이라 다필지 단지가 과소평가됨)

안전장치:
  - 본번의 부번을 0부터 순차 조회, '대'가 아니거나 응답 없으면 그 부번은 제외.
  - 부번 연속 조회는 최대 SUB_MAX까지. 중간 빈 부번은 건너뛰되 과도 확장 방지.
  - dry-run(기본): 저장하지 않고 기존값 대비 비교표만 출력.
    실제 반영: --apply 인자.

반영 시:
  - platArea = 합산 실측, platAreaEstimated=False, platAreaSource='토지대장 다필지 합산'
  - far = vlRatEstmTotArea / platArea * 100 (합산 대지 기준 재산정, 50~500 범위일 때만)
  - 이후 calc_cmc.py 재실행으로 CMC/대지평당가 갱신 권장

실행:
  검증:  python3 scripts/refine_plat_area.py
  반영:  python3 scripts/refine_plat_area.py --apply
"""
import json, os, sys, time
import fetch_complex_far as FAR

MASTER=os.path.join(os.path.dirname(__file__),'..','public','data','complexes_master.json')
TICKER=os.path.join(os.path.dirname(__file__),'..','public','data','gangnam_ticker_master.json')
PY=3.3058
SUB_MAX=15  # 부번 0~15까지 조회

def parcel(bjdong, bun, ji):
    pnu='11680'+bjdong+'1'+str(bun).zfill(4)+str(ji).zfill(4)
    d=FAR.fetch_json(f"{FAR.LAND_LAMBDA}?pnu={pnu}")
    fields=d.get('landCharacteristicss',{}).get('field',[]) if d else []
    if not fields: return None
    fields.sort(key=lambda x:-int(x.get('stdrYear',0) or 0))
    f=fields[0]
    ar=float(f.get('lndpclAr') or 0)
    jimok=f.get('lndcgrCodeNm') or ''
    return {'ar':ar,'jimok':jimok}

def sum_parcels(bjdong, jibun):
    """본번 + 부번(대지목만) 합산. 반환: (합계㎡, 필지리스트)"""
    base=jibun.split('-')[0]
    parts=[]
    total=0.0
    for ji in range(0, SUB_MAX+1):
        r=parcel(bjdong, base, ji)
        time.sleep(0.2)
        if not r or r['ar']<=0:
            continue
        # 지목이 '대'인 필지만 합산 (도로/공원 등 제외)
        if '대' not in r['jimok']:
            continue
        label=f"{base}{'-'+str(ji) if ji else ''}"
        parts.append((label, r['ar'], r['jimok']))
        total+=r['ar']
    return total, parts

def main():
    apply='--apply' in sys.argv
    m=json.load(open(MASTER,encoding='utf-8'))
    linked=[x for x in m if x.get('ticker')]

    print(f"{'티커':8}{'약칭':10}{'기존대지':>10}{'합산대지':>10}{'필지수':>5}{'차이':>8}  비고")
    print('-'*70)
    changes=[]
    for x in sorted(linked,key=lambda r:-(r.get('platArea') or 0)):
        bjdong=x['bjdong']; jibun=x['jibun']
        old=x.get('platArea') or 0
        total, parts=sum_parcels(bjdong, jibun)
        if total<=0:
            print(f"{x['ticker']:8}{x['shortName']:10}{old:>10.0f}{'조회실패':>10}{'':>5}{'':>8}  토지대장 응답없음(기존 유지)")
            continue
        diff=total-old
        flag=''
        # 합산이 기존보다 작아지면(역산값이 더 큰 경우) 보수적으로 표시만
        if total<old*0.9: flag='⚠합산<기존'
        changes.append((x, total, parts, old, diff))
        pstr=f"{len(parts)}필지"
        print(f"{x['ticker']:8}{x['shortName']:10}{old:>10.0f}{total:>10.0f}{len(parts):>5}{diff:>+8.0f}  {flag}{' '+','.join(p[0] for p in parts[1:]) if len(parts)>1 else ''}")

    if not apply:
        print("\n[검증 모드] 저장 안 함. 반영하려면: python3 scripts/refine_plat_area.py --apply")
        return

    # 반영
    tk=json.load(open(TICKER,encoding='utf-8'))
    tkmap={t['ticker']:t for t in tk}
    applied=0
    for x, total, parts, old, diff in changes:
        x['platArea']=round(total,1)
        x['platAreaEstimated']=False
        x['platAreaSource']='토지대장 다필지 합산'
        x['platParcels']=[p[0] for p in parts]
        vle=x.get('vlRatEstmTotArea') or 0
        if vle>0:
            far=vle/total*100
            if 50<far<500:
                x['far']=round(far,1)
                x['farSource']='역산(vlRatEstm/다필지합산대지)'
        # 티커 마스터 platArea도 참고용 동기화
        if x['ticker'] in tkmap:
            tkmap[x['ticker']]['platArea']=round(total,1)
        applied+=1
    json.dump(m,open(MASTER,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
    json.dump(tk,open(TICKER,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
    print(f"\n[반영 완료] {applied}개 대지면적 실측 갱신. 다음: python3 scripts/calc_cmc.py 로 CMC 재계산 권장")

if __name__=='__main__':
    main()
