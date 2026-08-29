#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
신규/미편입 단지 ETA 잠정 자동 부여 정책 (2026-08-29 대표 확정)

정책:
  - 추진위(stage=3): 기본 ETA 12년, 리스크 있으면 +년, 단 상한 14년 (15년+ 무의미 → 14년 캡)
  - 조합설립(stage=4): 기본 ETA 10년, 리스크 있으면 +1년
  - 리스크 판정: risk/note에 통합·갈등·분쟁·지연·장기·소송·일몰 키워드 포함 시
  - 입주년도(moveIn) = 현재연도(2026) + ETA
  - 잠정값 표시: etaProvisional=true, etaSource='정책 자동부여(단계기준)'
  - 이미 eta가 있는 단지(재건축 마스터DB 편입분)는 건드리지 않음

실행: python3 scripts/assign_provisional_eta.py
"""
import json, os

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
MASTER = os.path.join(BASE, 'complexes_master.json')
TICKER = os.path.join(BASE, 'gangnam_ticker_master.json')

BASE_YEAR = 2026
RISK_KEYWORDS = ('통합', '갈등', '분쟁', '지연', '장기', '소송', '일몰')

STAGE3_BASE = 12   # 추진위 기본
STAGE3_CAP  = 14   # 추진위 상한
STAGE4_BASE = 10   # 조합설립 기본


def has_risk(text):
    t = text or ''
    return any(k in t for k in RISK_KEYWORDS)


def calc_eta(stage, risk_text):
    risk = has_risk(risk_text)
    if stage == 3:
        eta = STAGE3_BASE + (2 if risk else 0)   # 리스크 시 +2 (통합/갈등 등)
        return min(eta, STAGE3_CAP)               # 상한 14년
    if stage == 4:
        return STAGE4_BASE + (1 if risk else 0)   # 리스크 시 +1
    return None


def apply(records, is_master):
    changed = []
    for r in records:
        if not r.get('ticker'):
            continue
        if r.get('eta') is not None:
            continue  # 이미 값 있음(마스터DB 편입분) → 유지
        stage = r.get('stage')
        risk_text = r.get('risk') or r.get('note') or ''
        eta = calc_eta(stage, risk_text)
        if eta is None:
            continue
        r['eta'] = eta
        r['moveIn'] = BASE_YEAR + int(eta)
        r['etaProvisional'] = True
        r['etaSource'] = '정책 자동부여(단계기준)'
        changed.append((r['ticker'], stage, eta, r['moveIn'], has_risk(risk_text)))
    return changed


def main():
    master = json.load(open(MASTER, encoding='utf-8'))
    ticker = json.load(open(TICKER, encoding='utf-8'))

    cm = apply(master, True)
    ct = apply(ticker, False)

    json.dump(master, open(MASTER, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    json.dump(ticker, open(TICKER, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    print("=== 잠정 ETA 부여 (complexes_master) ===")
    for tk, st, eta, mv, risk in cm:
        print(f"  {tk:8} 단계{st} → ETA {eta}년, 입주 {mv} {'(리스크+)' if risk else ''}")
    print(f"총 {len(cm)}개 (ticker master도 동일 반영: {len(ct)}개)")


if __name__ == '__main__':
    main()
