#!/usr/bin/env python3
"""
재건축 단지 현재 시세 일괄 산출 스크립트
- Lambda API로 실거래가 6개월 조회
- 단지별 평당가(공급면적 기준) 산출
- 결과를 complexes_master.json에 병합 저장

실행: python3 scripts/fetch_complex_prices.py
"""

import json
import time
import urllib.request
import xml.etree.ElementTree as ET
import os
from datetime import datetime, timedelta
from collections import defaultdict

LAMBDA_URL = 'https://33bujx6lkx33gqxalne4ufncsy0lchzk.lambda-url.ap-northeast-2.on.aws/'

def fetch_trades(lawd_cd, deal_ymd):
    """월별 실거래 조회"""
    url = f"{LAMBDA_URL}?LAWD_CD={lawd_cd}&DEAL_YMD={deal_ymd}&pageNo=1&numOfRows=1000"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read().decode('utf-8')
        root = ET.fromstring(data)
        items = []
        for item in root.iter('item'):
            apt_nm = item.findtext('aptNm', '').strip()
            jibun = item.findtext('jibun', '').strip()
            umd = item.findtext('umdNm', '').strip()
            area = float(item.findtext('excluUseAr', '0') or '0')
            price = int((item.findtext('dealAmount', '0') or '0').replace(',', '').strip() or '0')
            floor = int(item.findtext('floor', '0') or '0')
            cdeal = item.findtext('cdealType', '').strip()
            year = item.findtext('dealYear', '').strip()
            month = item.findtext('dealMonth', '').strip()
            day = item.findtext('dealDay', '').strip()
            items.append({
                'aptNm': apt_nm, 'jibun': jibun, 'umdNm': umd,
                'excluUseAr': area, 'dealAmount': price, 'floor': floor,
                'cdealType': cdeal, 'dealYear': year, 'dealMonth': month, 'dealDay': day,
            })
        return items
    except Exception as e:
        print(f"    API 오류: {e}")
        return []


def match_trades(all_trades, complex_info):
    """단지에 해당하는 거래 필터링"""
    dong = complex_info['dong']
    jibun = complex_info['jibun']
    name = complex_info['name']
    
    # 1차: 동 + 지번 매칭
    matched = [t for t in all_trades if t['umdNm'] == dong and t['jibun'] == jibun]
    
    # 2차: 키워드 매칭 (지번 매칭 실패 시)
    if not matched:
        kw = name.replace('아파트', '').replace('단지', '').replace('맨션', '')[:4]
        matched = [t for t in all_trades 
                   if t['umdNm'] == dong and (kw in t['aptNm'] or t['aptNm'] in name)]
    
    # 이상치 제거: 1층 제외, 취소 제외
    matched = [t for t in matched if t['floor'] > 1 and not t['cdealType']]
    
    return matched


def calculate_price_stats(trades):
    """거래 목록에서 시세 통계 산출 (전용면적 기준)"""
    if not trades:
        return None
    
    # 평당가 산출 (전용면적 기준)
    ppps = []
    for t in trades:
        if t['excluUseAr'] > 0 and t['dealAmount'] > 0:
            exclu_py = t['excluUseAr'] / 3.3058  # 전용 평
            ppp = t['dealAmount'] / exclu_py
            ppps.append(ppp)
    
    if not ppps:
        return None
    
    # IQR 이상치 제거
    if len(ppps) >= 4:
        sorted_ppps = sorted(ppps)
        q1 = sorted_ppps[len(sorted_ppps) // 4]
        q3 = sorted_ppps[3 * len(sorted_ppps) // 4]
        iqr = q3 - q1
        ppps = [p for p in ppps if q1 - iqr <= p <= q3 + iqr]
    
    if not ppps:
        return None
    
    avg_ppp = sum(ppps) / len(ppps)
    
    # 최근 거래 (최신 1건)
    trades_sorted = sorted(trades, key=lambda t: (t['dealYear'], t['dealMonth'], t['dealDay']), reverse=True)
    latest = trades_sorted[0]
    latest_area = latest['excluUseAr']
    latest_price = latest['dealAmount']
    latest_exclu_py = latest_area / 3.3058  # 전용 평
    
    return {
        'avgPPP': round(avg_ppp),           # 평균 전용 평당가 (만원)
        'tradeCount': len(trades),          # 거래건수
        'latestPrice': latest_price,        # 최근 거래가 (만원)
        'latestArea': latest_area,          # 최근 거래 전용면적
        'latestExcluPy': round(latest_exclu_py, 1),  # 전용 평
        'latestFloor': latest['floor'],
        'latestDate': f"{latest['dealYear']}.{latest['dealMonth'].zfill(2)}",
    }


def main():
    master_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'complexes_master.json')
    
    with open(master_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 강남구만 우선 처리 (확장 시 서초/송파도)
    targets = [d for d in data if d['gu'] == '강남구']
    print(f"강남구 {len(targets)}개 단지 시세 산출 시작\n")
    
    # 법정동코드별 그룹
    lawd_cd = '11680'  # 강남구
    
    # 6개월 거래 일괄 조회
    now = datetime.now()
    all_trades = []
    for i in range(6):
        d = datetime(now.year, now.month - i if now.month - i > 0 else now.month - i + 12, 1)
        if now.month - i <= 0:
            d = datetime(now.year - 1, now.month - i + 12, 1)
        ym = f"{d.year}{d.month:02d}"
        print(f"  {ym} 조회 중...", end=' ')
        trades = fetch_trades(lawd_cd, ym)
        all_trades.extend(trades)
        print(f"{len(trades)}건")
        time.sleep(0.3)
    
    print(f"\n총 거래: {len(all_trades)}건\n")
    print(f"{'No':<3} {'단지명':<18} {'거래':>4} {'평당가':>8} {'최근가':>8} {'면적':>6} {'일자'}")
    print("-" * 70)
    
    success = 0
    for i, target in enumerate(targets, 1):
        matched = match_trades(all_trades, target)
        stats = calculate_price_stats(matched)
        
        # 마스터 데이터에 시세 정보 병합
        idx = data.index(target)
        if stats:
            data[idx]['avgPPP'] = stats['avgPPP']
            data[idx]['tradeCount'] = stats['tradeCount']
            data[idx]['latestPrice'] = stats['latestPrice']
            data[idx]['latestArea'] = stats['latestArea']
            data[idx]['latestExcluPy'] = stats['latestExcluPy']
            data[idx]['latestFloor'] = stats['latestFloor']
            data[idx]['latestDate'] = stats['latestDate']
            data[idx]['priceUpdated'] = now.strftime('%Y-%m-%d')
            success += 1
            
            price_str = f"{stats['latestPrice']/10000:.1f}억" if stats['latestPrice'] >= 10000 else f"{stats['latestPrice']:,}만"
            print(f"{i:<3} {target['name']:<18} {stats['tradeCount']:>4} {stats['avgPPP']:>7,}만 {price_str:>8} {stats['latestArea']:>5.1f}㎡ {stats['latestDate']}")
        else:
            print(f"{i:<3} {target['name']:<18}    — 거래 없음")
    
    # 저장
    with open(master_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*70}")
    print(f"완료: {success}/{len(targets)} 단지 시세 확보")
    print(f"저장: {master_path}")


if __name__ == '__main__':
    main()
