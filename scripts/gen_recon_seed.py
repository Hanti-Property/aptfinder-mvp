#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
complexes_master.json의 재건축 티커 단지 38개 → recon_master INSERT SQL 생성.
실행: python3 scripts/gen_recon_seed.py > scripts/recon_master_seed.sql
"""
import json, os

MASTER = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'complexes_master.json')

# JSON 필드 → 테이블 컬럼 매핑
MAP = [
    ('assetId', 'asset_id'), ('ticker', 'ticker'), ('name', 'name'), ('shortName', 'short_name'),
    ('gu', 'gu'), ('dong', 'dong'), ('jibun', 'jibun'), ('bjdong', 'bjdong'), ('lawd', 'lawd'),
    ('stage', 'stage'), ('builder', 'builder'), ('eta', 'eta'), ('rdt', 'rdt'), ('moveIn', 'move_in'),
    ('risk', 'risk'), ('etaProvisional', 'eta_provisional'), ('etaSource', 'eta_source'),
    ('targetFar', 'target_far'), ('targetFarRule', 'target_far_rule'),
    ('far', 'far'), ('farSource', 'far_source'), ('farTBD', 'far_tbd'),
    ('platArea', 'plat_area'), ('platAreaSource', 'plat_area_source'), ('platAreaEstimated', 'plat_area_estimated'),
    ('totArea', 'tot_area'), ('vlRatEstmTotArea', 'vlrat_estm_area'),
    ('avgPPP', 'avg_ppp'), ('latestPrice', 'latest_price'), ('latestArea', 'latest_area'),
    ('latestExcluPy', 'latest_exclu_py'), ('latestFloor', 'latest_floor'), ('latestDate', 'latest_date'),
    ('latestMonthsAgo', 'latest_months_ago'), ('tradeCount', 'trade_count'), ('priceUpdated', 'price_updated'),
    ('cmc', 'cmc'), ('landPppMarket', 'land_ppp_market'), ('capGrade', 'cap_grade'),
    ('ncmc', 'ncmc'), ('ncmcNewPpp', 'ncmc_new_ppp'), ('ncmcNvpBase', 'ncmc_nvp_base'), ('rar', 'rar'),
    ('sizeGrade', 'size_grade'), ('tradeReliability', 'trade_reliability'),
    ('nvpGapRate', 'nvp_gap_rate'), ('warnDistortion', 'warn_distortion'),
    ('type', 'type'), ('reconSource', 'recon_source'),
]
# households: h 우선, 없으면 hhldCnt
# trade_name: 배열


def sqlval(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'TRUE' if v else 'FALSE'
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def arrval(v):
    if not v:
        return 'NULL'
    inner = ','.join("'" + str(x).replace("'", "''") + "'" for x in v)
    return f'ARRAY[{inner}]'


def main():
    d = json.load(open(MASTER, encoding='utf-8'))
    recon = [x for x in d if x.get('ticker') and x.get('cmc') is not None]

    cols = [c for _, c in MAP] + ['households', 'trade_name']
    print('-- 재건축 마스터 seed (complexes_master.json 38개, 2026-09-01 자동생성)')
    print('-- 실행 전 recon_master_schema.sql 먼저 실행')
    print(f'INSERT INTO recon_master ({", ".join(cols)}) VALUES')
    rows = []
    for x in recon:
        vals = [sqlval(x.get(j)) for j, _ in MAP]
        vals.append(sqlval(x.get('h') or x.get('hhldCnt')))
        vals.append(arrval(x.get('tradeName')))
        rows.append('(' + ', '.join(vals) + ')')
    print(',\n'.join(rows))
    print('ON CONFLICT (asset_id) DO NOTHING;')


if __name__ == '__main__':
    main()
