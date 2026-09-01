#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
투자자 보호 플래그 산출 — 정보 왜곡 위험을 표시.
작성 2026-09-01.

3개 지표를 각 재건축 티커 단지에 저장:
  1. tradeReliability  거래 신뢰도 (현재가의 근거가 얼마나 믿을 만한가)
       - low   : 최근거래 12개월+ 경과  또는  거래 1건 이하
       - mid   : 6~12개월              또는  2건
       - high  : 6개월 이내 + 3건 이상
       근거: 소규모 단지는 거래가 드물어 현재가(CMC 분모)가 낡거나 편향 → RAR 왜곡
  2. nvpGapRate  NVP 괴리율(%) = (현재 대지평당가 - 동 평균) / 동 평균 × 100
       - 음수가 클수록 저평가 → RAR 과대 위험. -25% 이하면 'wide'
  3. sizeGrade  단지 규모 등급 (1,000세대 이하 소규모 세분)
       - xs 100~300 / s 301~600 / m 601~900 / l 901~1000 / xl 1000+

부가: latestMonthsAgo(최근거래 경과월), warnDistortion(왜곡주의 종합 플래그)

실행: python3 scripts/calc_flags.py
"""
import json, os
from collections import defaultdict
from datetime import datetime

MASTER = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'complexes_master.json')
NOW = datetime(2026, 9, 1)

GAP_WIDE_THRESHOLD = -25.0   # 괴리율 이 값 이하면 저평가 경고


def months_ago(s):
    try:
        y, m = s.split('.')
        return (NOW.year - int(y)) * 12 + (NOW.month - int(m))
    except Exception:
        return 99


def trade_reliability(months, cnt):
    if months >= 12 or cnt <= 1:
        return 'low'
    if months >= 6 or cnt <= 2:
        return 'mid'
    return 'high'


def size_grade(h):
    if h <= 300:  return 'xs'   # 초소형
    if h <= 600:  return 's'    # 소형
    if h <= 900:  return 'm'    # 중소형
    if h <= 1000: return 'l'    # 준대형
    return 'xl'                 # 대단지


def main():
    d = json.load(open(MASTER, encoding='utf-8'))
    recon = [x for x in d if x.get('ticker') and x.get('cmc') and x.get('landPppMarket')]

    # 동 평균 현재 대지평당가
    dv = defaultdict(list)
    for x in recon:
        dv[x['dong']].append(x['landPppMarket'])
    dong_avg = {k: sum(v) / len(v) for k, v in dv.items()}

    for x in d:
        if x not in recon:
            for k in ('tradeReliability', 'nvpGapRate', 'sizeGrade',
                      'latestMonthsAgo', 'warnDistortion'):
                x.pop(k, None)
            continue
        h = x.get('h') or x.get('hhldCnt') or 0
        ma = months_ago(x.get('latestDate', ''))
        tc = x.get('tradeCount') or 0
        rel = trade_reliability(ma, tc)
        avg = dong_avg[x['dong']]
        gap = round((x['landPppMarket'] - avg) / avg * 100, 1) if avg else 0.0

        x['sizeGrade'] = size_grade(h)
        x['latestMonthsAgo'] = ma
        x['tradeReliability'] = rel
        x['nvpGapRate'] = gap
        # 종합 왜곡주의: 신뢰도 낮음 OR 괴리 큼(저평가)
        x['warnDistortion'] = (rel == 'low') or (gap <= GAP_WIDE_THRESHOLD)

    json.dump(d, open(MASTER, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    # 리포트
    SG = {'xs': '초소형', 's': '소형', 'm': '중소형', 'l': '준대형', 'xl': '대단지'}
    RL = {'low': '낮음', 'mid': '보통', 'high': '양호'}
    rows = [(x['shortName'], x.get('h'), x['sizeGrade'], x['tradeReliability'],
             x['latestMonthsAgo'], x['nvpGapRate'], x.get('rar'), x['warnDistortion'])
            for x in recon]
    rows.sort(key=lambda r: (not r[7], r[5]))
    print(f"{'단지':11s}{'세대':>5}{'규모':>7}{'신뢰':>6}{'경과':>5}{'괴리':>7}{'RAR':>6} 왜곡주의")
    for r in rows:
        print(f'{r[0]:11s}{str(r[1]):>5}{SG[r[2]]:>7}{RL[r[3]]:>6}{r[4]:>4}m'
              f'{r[5]:>6.0f}%{str(r[6]):>6}  {"⚠️" if r[7] else ""}')
    n_warn = sum(1 for r in rows if r[7])
    print(f"\n왜곡주의 플래그: {n_warn}개 / {len(rows)}개")


if __name__ == '__main__':
    main()
