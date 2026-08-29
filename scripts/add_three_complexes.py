#!/usr/bin/env python3
"""
신규 3개 단지 자체DB(complexes_master.json) 추가 + 용적률/실거래 채움
- APHD4  압구정동 현대4차   지번 462  h170
- APHD10 압구정동 현대10차  지번 436  h144
- GPHD3  개포동   현대3차    지번 177  h198

기존 fetch_complex_far.get_far_for_complex / fetch_complex_prices 로직 재사용.
실행: python3 scripts/add_three_complexes.py
"""
import json, os, time
from datetime import datetime

import fetch_complex_far as FAR
import fetch_complex_prices as PRICE

MASTER = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'complexes_master.json')
LAWD_GANGNAM = '11680'

NEW = [
    {"gu":"강남구","dong":"압구정동","name":"현대4차","jibun":"462","h":170,"bjdong":"11000"},
    {"gu":"강남구","dong":"압구정동","name":"현대10차","jibun":"436","h":144,"bjdong":"11000"},
    {"gu":"강남구","dong":"개포동","name":"현대3차","jibun":"177","h":198,"bjdong":"10300"},
]


def build_price_stats_for(entry, all_trades):
    matched = PRICE.match_trades(all_trades, entry)
    return PRICE.calculate_price_stats(matched)


def main():
    data = json.load(open(MASTER, encoding='utf-8'))
    present = {(x['gu'], x['dong'], x['jibun']) for x in data}

    # 실거래 12개월 일괄 조회 (강남구)
    now = datetime.now()
    all_trades = []
    print("실거래 12개월 조회...")
    for i in range(12):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12; y -= 1
        ym = f"{y}{m:02d}"
        t = PRICE.fetch_trades(LAWD_GANGNAM, ym)
        all_trades.extend(t)
        print(f"  {ym}: {len(t)}건")
        time.sleep(0.3)
    print(f"총 {len(all_trades)}건\n")

    added = 0
    for c in NEW:
        key = (c['gu'], c['dong'], c['jibun'])
        if key in present:
            print(f"이미 존재: {c['name']} {c['jibun']} — 건너뜀")
            continue

        print(f"[{c['name']} {c['dong']} {c['jibun']}] 건축물대장 조회...")
        far = FAR.get_far_for_complex(LAWD_GANGNAM, c['bjdong'], c['jibun'])

        entry = {
            "gu": c['gu'], "dong": c['dong'], "name": c['name'], "jibun": c['jibun'],
            "h": c['h'], "bjdong": c['bjdong'], "lawd": LAWD_GANGNAM,
            "far": far['far'],
            "hhldCnt": far['hhldCnt'] or c['h'],
            "vlRatEstmTotArea": far['vlRatEstmTotArea'],
            "totArea": far['totArea'],
            "farSource": far['source'],
            "type": "reconstruction",
        }
        print(f"    용적률 {far['far']}% ({far['source']}), 세대 {entry['hhldCnt']}")

        stats = build_price_stats_for({"dong":c['dong'],"jibun":c['jibun'],"name":c['name']}, all_trades)
        if stats:
            entry.update({
                "avgPPP": stats['avgPPP'],
                "tradeCount": stats['tradeCount'],
                "latestPrice": stats['latestPrice'],
                "latestArea": stats['latestArea'],
                "latestExcluPy": stats['latestExcluPy'],
                "latestFloor": stats['latestFloor'],
                "latestDate": stats['latestDate'],
                "priceUpdated": now.strftime('%Y-%m-%d'),
            })
            print(f"    실거래 {stats['tradeCount']}건, 평당가 {stats['avgPPP']:,}만, 최근 {stats['latestPrice']:,}만 ({stats['latestArea']}㎡, {stats['latestDate']})")
        else:
            print("    실거래 없음 — 시세 필드 미기입")

        data.append(entry)
        added += 1
        time.sleep(0.3)

    json.dump(data, open(MASTER, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"\n완료: {added}개 추가, 총 {len(data)}개 → 저장 {MASTER}")


if __name__ == '__main__':
    main()
