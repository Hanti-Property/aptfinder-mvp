#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CMC 월간 갱신 통합 스크립트 (실거래 최신화 → CMC 재계산)

동작:
  1) fetch_complex_prices.main()  — 국토부 실거래 최신화 (강남구, complexes_master.json의 latestPrice 등 갱신)
  2) calc_cmc.main()              — CMC / 대지평당가 / 자산규모등급 재계산

용도:
  - 평소엔 저장된 값 사용, 주기적(예: 매월 1일)으로 이 스크립트 1회 실행하여 최신화.
  - 향후 GitHub Actions cron으로 자동화 예정.

실행: python3 scripts/refresh_cmc.py
"""
import sys, os, time, traceback

sys.path.insert(0, os.path.dirname(__file__))
import fetch_complex_prices as PRICES
import calc_cmc as CMC


def main():
    t0=time.time()
    print("="*60)
    print("  CMC 월간 갱신 시작:", time.strftime("%Y-%m-%d %H:%M:%S"))
    print("="*60)

    # 1) 실거래 최신화
    print("\n[1/2] 국토부 실거래 최신화 (강남구)...")
    try:
        PRICES.main()
    except Exception as e:
        print("  ⚠️ 실거래 최신화 중 오류:", e)
        traceback.print_exc()
        print("  → 기존 실거래 데이터로 CMC 재계산을 계속 진행합니다.")

    # 2) CMC 재계산
    print("\n[2/2] CMC / 대지평당가 / 자산규모등급 재계산...")
    CMC.main()

    print(f"\n{'='*60}")
    print(f"  완료 (소요 {time.time()-t0:.0f}초)")
    print(f"  변경 파일: public/data/complexes_master.json, gangnam_ticker_master.json")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
