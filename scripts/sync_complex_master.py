#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
단지 마스터 싱크 스크립트 (정적 데이터 통합)

기준(SoT): public/data/gangnam_ticker_master.json  (티커·약칭·지번·세대수)
보강 소스:
  - 재건축 사업정보: gangnam_recon_master_db.md (2026-08-23 대표 v3) → 아래 RECON dict
  - 건축물대장/토지대장: complexes_master.json (far, platArea 등, 이미 반영됨)

싱크 규칙:
  - 정적 필드(단계·시공사·ETA·입주년도·리스크·용적률·대지면적)만 싱크
  - 동적 필드(실거래가/평당가/거래일 = latestPrice, avgPPP, tradeCount 등)는 건드리지 않음
  - 지번(bjdong+jibun)을 조인 키로 사용 (지번 우선 매칭 원칙)

출력:
  - gangnam_ticker_master.json: stage/builder/eta/rdt/moveIn/risk 추가
  - complexes_master.json: ticker/shortName + stage/builder/eta/moveIn/risk 추가 (정적만)

실행: python3 scripts/sync_complex_master.py
"""
import json, os, re

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
TICKER = os.path.join(BASE, 'gangnam_ticker_master.json')
MASTER = os.path.join(BASE, 'complexes_master.json')

# 실거래 등 동적 필드 (싱크 대상에서 제외 — complexes_master 원본 유지)
DYNAMIC_FIELDS = {
    'avgPPP', 'tradeCount', 'latestPrice', 'latestArea', 'latestExcluPy',
    'latestSupplyPy', 'latestFloor', 'latestDate', 'priceUpdated',
}

# 재건축 사업정보 (gangnam_recon_master_db.md 2026-08-23 대표 v3), 티커 키
RECON = {
 "GPHS":    {"stage":7,"builder":"","eta":6.0,"rdt":0,"moveIn":2032,"risk":"이주완료, 분양전"},
 "GP5":     {"stage":6,"builder":"대우건설","eta":6.0,"rdt":0,"moveIn":2032,"risk":"이주중. 리스크 없음"},
 "GP6-7":   {"stage":6,"builder":"","eta":7.0,"rdt":1.5,"moveIn":2033,"risk":"상가분쟁+사업성"},
 "DGPHS":   {"stage":6,"builder":"","eta":7.0,"rdt":0,"moveIn":2033,"risk":""},
 "EM":      {"stage":5,"builder":"삼성물산, GS건설","eta":8.0,"rdt":0,"moveIn":2034,"risk":"대치동 대장주. 관리처분 준비중"},
 "DCWS1":   {"stage":5,"builder":"삼성물산","eta":8.0,"rdt":1.0,"moveIn":2034,"risk":"사업지연"},
 "DCSS2":   {"stage":5,"builder":"삼성물산","eta":9.0,"rdt":1.0,"moveIn":2035,"risk":"상가분쟁+사업지연"},
 "DCSS1":   {"stage":5,"builder":"","eta":9.5,"rdt":1.5,"moveIn":2036,"risk":"단독추진. 상가분쟁"},
 "APHY1":   {"stage":4,"builder":"현대건설","eta":10.0,"rdt":0,"moveIn":2036,"risk":"리스크 적음"},
 "APHY2":   {"stage":4,"builder":"","eta":10.0,"rdt":0,"moveIn":2036,"risk":""},
 "APNHD":   {"stage":4,"builder":"현대건설","eta":10.0,"rdt":0,"moveIn":2036,"risk":"압구정 최속"},
 "APHD8":   {"stage":4,"builder":"삼성물산","eta":10.0,"rdt":0,"moveIn":2036,"risk":""},
 "APHY3":   {"stage":4,"builder":"삼성물산","eta":10.0,"rdt":0,"moveIn":2036,"risk":""},
 "APHY4":   {"stage":4,"builder":"삼성물산","eta":10.0,"rdt":0,"moveIn":2036,"risk":""},
 "APHY6":   {"stage":4,"builder":"삼성물산","eta":10.0,"rdt":0,"moveIn":2036,"risk":""},
 "ILWS7":   {"stage":4,"builder":"삼성물산","eta":10.0,"rdt":0,"moveIn":2036,"risk":"순항"},
 "GPWS6":   {"stage":4,"builder":"GS건설","eta":10.0,"rdt":0,"moveIn":2036,"risk":"사업시행계획 추진"},
 "APHD6-7": {"stage":4,"builder":"","eta":11.0,"rdt":1.0,"moveIn":2037,"risk":"토지소송"},
 "APHD1-2": {"stage":4,"builder":"","eta":11.0,"rdt":1.0,"moveIn":2037,"risk":"토지소송"},
 "APHD3":   {"stage":4,"builder":"","eta":11.0,"rdt":1.0,"moveIn":2037,"risk":"토지분쟁"},
 "APHD14":  {"stage":4,"builder":"","eta":11.0,"rdt":1.0,"moveIn":2037,"risk":"토지분쟁"},
 "APHD13":  {"stage":4,"builder":"","eta":11.0,"rdt":1.0,"moveIn":2037,"risk":"토지분쟁"},
 "APHD5":   {"stage":4,"builder":"","eta":11.0,"rdt":1.0,"moveIn":2037,"risk":"토지분쟁"},
 "SK":      {"stage":3,"builder":"","eta":12.0,"rdt":0,"moveIn":2038,"risk":""},
 "MIDO":    {"stage":3,"builder":"","eta":12.0,"rdt":1.0,"moveIn":2038,"risk":"대형평형 갈등"},
 "APHY5":   {"stage":3,"builder":"","eta":12.0,"rdt":0,"moveIn":2038,"risk":""},
 "GPWS8":   {"stage":3,"builder":"","eta":12.0,"rdt":1.0,"moveIn":2038,"risk":"통합 조율"},
 "APMS1":   {"stage":3,"builder":"","eta":14.0,"rdt":2.0,"moveIn":2040,"risk":"갈등"},
 "APMS2":   {"stage":3,"builder":"","eta":14.0,"rdt":2.0,"moveIn":2040,"risk":"갈등"},
 "GPKNM":   {"stage":3,"builder":"","eta":15.0,"rdt":3.0,"moveIn":2041,"risk":"경우현 통합갈등"},
 "APHY7":   {"stage":3,"builder":"","eta":15.0,"rdt":3.0,"moveIn":2041,"risk":"장기정체+통합"},
}


def parse_stage(recon_stage_str):
    """'4 조합설립' -> 4"""
    m = re.match(r'\s*(\d+)', recon_stage_str or '')
    return int(m.group(1)) if m else None


def main():
    tickers = json.load(open(TICKER, encoding='utf-8'))
    master = json.load(open(MASTER, encoding='utf-8'))

    # 지번키 -> master 레코드 인덱스
    idx_by_key = {}
    for i, m in enumerate(master):
        idx_by_key[(m.get('bjdong'), m.get('jibun'))] = i

    synced_ticker = 0
    synced_master = 0
    no_recon = []

    for t in tickers:
        tk = t['ticker']
        r = RECON.get(tk)

        # 단계: recon DB 우선, 없으면 CSV reconStage 파싱
        stage = r['stage'] if r else parse_stage(t.get('reconStage'))
        builder = r['builder'] if r else ''
        eta = r['eta'] if r else None
        rdt = r['rdt'] if r else None
        move_in = r['moveIn'] if r else None
        # 신규/변경 단지는 note를 리스크 힌트로
        risk = r['risk'] if r else (t.get('note', '') or '')
        recon_source = 'recon_master_db_260823' if r else 'ticker_csv(신규/미편입)'
        if not r:
            no_recon.append(tk)

        # 1) 티커 마스터에 사업정보 싱크
        t['stage'] = stage
        t['builder'] = builder
        t['eta'] = eta
        t['rdt'] = rdt
        t['moveIn'] = move_in
        t['risk'] = risk
        t['reconSource'] = recon_source
        synced_ticker += 1

        # 2) complexes_master 정적 필드 싱크 (지번 조인)
        key = (t.get('bjdong'), t.get('jibun'))
        mi = idx_by_key.get(key)
        if mi is not None:
            m = master[mi]
            # 티커 식별자
            m['ticker'] = tk
            m['shortName'] = t['shortName']
            # 사업정보 (정적)
            m['stage'] = stage
            m['builder'] = builder
            m['eta'] = eta
            m['rdt'] = rdt
            m['moveIn'] = move_in
            m['risk'] = risk
            m['reconSource'] = recon_source
            # 동적 필드는 절대 건드리지 않음 (DYNAMIC_FIELDS 유지)
            synced_master += 1

    json.dump(tickers, open(TICKER, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    json.dump(master, open(MASTER, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    print(f"티커 마스터 싱크: {synced_ticker}개")
    print(f"complexes_master 싱크: {synced_master}개 (지번 조인 성공)")
    print(f"recon DB 미편입(신규/변경, 단계는 CSV값 사용): {len(no_recon)}개 → {no_recon}")
    print("동적 필드(실거래 등)는 유지, 싱크 대상 아님")


if __name__ == '__main__':
    main()
