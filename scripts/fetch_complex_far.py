#!/usr/bin/env python3
"""
143개 재건축 단지 용적률 일괄 조회 스크립트
- 건축물대장 총괄표제부 + 표제부 병합으로 용적률 확보
- 결과를 public/data/complexes_master.json에 저장
- 확장성: 일반 단지 추가 시 동일 구조 사용

실행: python3 scripts/fetch_complex_far.py
"""

import json
import time
import urllib.request
import urllib.parse
import os

BLD_KEY = 'Q5ESFBIwOv0jBJFO74hayYGsfDZH6Xvz70FGVRXojNTmCuxoXtrvBbXpmwBuAMc2mjbjLFjW7llkX3liqloF4A%3D%3D'
LAWD_MAP = {'강남구': '11680', '서초구': '11650', '송파구': '11710'}

# 143개 단지 마스터 리스트 (RVI 대시보드와 동일)
ALL_COMPLEXES = [
    {"gu":"강남구","dong":"대치동","name":"은마아파트","jibun":"316","h":4424,"bjdong":"10600"},
    {"gu":"강남구","dong":"개포동","name":"대치,대청 아파트","jibun":"12","h":4199,"bjdong":"10300"},
    {"gu":"강남구","dong":"일원동","name":"수서1단지아파트","jibun":"711","h":2934,"bjdong":"11400"},
    {"gu":"강남구","dong":"수서동","name":"수서주공영구임대아파트","jibun":"707","h":2560,"bjdong":"11500"},
    {"gu":"강남구","dong":"대치동","name":"미도맨션아파트","jibun":"511","h":2435,"bjdong":"10600"},
    {"gu":"강남구","dong":"개포동","name":"개포주공아파트","jibun":"185","h":1960,"bjdong":"10300"},
    {"gu":"강남구","dong":"수서동","name":"수서6단지아파트","jibun":"723","h":1512,"bjdong":"11500"},
    {"gu":"강남구","dong":"수서동","name":"까치마을아파트","jibun":"746","h":1403,"bjdong":"11500"},
    {"gu":"강남구","dong":"압구정동","name":"현대아파트","jibun":"456","h":1340,"bjdong":"11000"},
    {"gu":"강남구","dong":"수서동","name":"신동아아파트","jibun":"736","h":1163,"bjdong":"11500"},
    {"gu":"강남구","dong":"대치동","name":"선경아파트","jibun":"506","h":1033,"bjdong":"10600"},
    {"gu":"강남구","dong":"압구정동","name":"현대아파트","jibun":"369-1","h":960,"bjdong":"11000"},
    {"gu":"강남구","dong":"개포동","name":"개포주공아파트","jibun":"187","h":940,"bjdong":"10300"},
    {"gu":"강남구","dong":"압구정동","name":"영동한양아파트","jibun":"490","h":936,"bjdong":"11000"},
    {"gu":"강남구","dong":"일원동","name":"푸른마을아파트","jibun":"719","h":930,"bjdong":"11400"},
    {"gu":"강남구","dong":"압구정동","name":"미성아파트","jibun":"397","h":910,"bjdong":"11000"},
    {"gu":"강남구","dong":"일원동","name":"일원동우성7차아파트","jibun":"615","h":802,"bjdong":"11400"},
    {"gu":"강남구","dong":"압구정동","name":"현대아파트","jibun":"434","h":765,"bjdong":"11000"},
    {"gu":"강남구","dong":"일원동","name":"상록수아파트","jibun":"734","h":740,"bjdong":"11400"},
    {"gu":"강남구","dong":"대치동","name":"개포1차우성아파트","jibun":"503","h":690,"bjdong":"10600"},
    {"gu":"강남구","dong":"개포동","name":"경남아파트","jibun":"649","h":675,"bjdong":"10300"},
    {"gu":"강남구","dong":"일원동","name":"목련타운","jibun":"716","h":650,"bjdong":"11400"},
    {"gu":"강남구","dong":"수서동","name":"삼익아파트","jibun":"708","h":645,"bjdong":"11500"},
    {"gu":"강남구","dong":"대치동","name":"쌍용대치아파트","jibun":"66","h":630,"bjdong":"10600"},
    {"gu":"강남구","dong":"일원동","name":"샘터마을아파트","jibun":"718","h":628,"bjdong":"11400"},
    {"gu":"강남구","dong":"압구정동","name":"현대아파트","jibun":"426","h":600,"bjdong":"11000"},
    {"gu":"강남구","dong":"일원동","name":"한솔마을","jibun":"731","h":570,"bjdong":"11400"},
    {"gu":"강남구","dong":"압구정동","name":"현대아파트","jibun":"433","h":559,"bjdong":"11000"},
    {"gu":"강남구","dong":"개포동","name":"현대아파트","jibun":"654","h":557,"bjdong":"10300"},
    {"gu":"강남구","dong":"논현동","name":"동현아파트","jibun":"105","h":548,"bjdong":"10800"},
    {"gu":"강남구","dong":"압구정동","name":"현대아파트","jibun":"481","h":516,"bjdong":"11000"},
    {"gu":"강남구","dong":"수서동","name":"수서한아름아파트","jibun":"712","h":498,"bjdong":"11500"},
    {"gu":"강남구","dong":"일원동","name":"가람아파트","jibun":"735","h":496,"bjdong":"11400"},
    {"gu":"강남구","dong":"대치동","name":"대치우성아파트","jibun":"63","h":476,"bjdong":"10600"},
    {"gu":"강남구","dong":"대치동","name":"개포2차우성아파트","jibun":"500","h":450,"bjdong":"10600"},
    {"gu":"강남구","dong":"압구정동","name":"현대아파트","jibun":"443","h":432,"bjdong":"11000"},
    {"gu":"강남구","dong":"개포동","name":"현대아파트","jibun":"653","h":416,"bjdong":"10300"},
    {"gu":"강남구","dong":"개포동","name":"우성아파트","jibun":"652","h":405,"bjdong":"10300"},
    {"gu":"강남구","dong":"압구정동","name":"현대아파트","jibun":"447","h":388,"bjdong":"11000"},
    {"gu":"강남구","dong":"청담동","name":"진흥아파트","jibun":"65","h":375,"bjdong":"10400"},
    {"gu":"강남구","dong":"대치동","name":"쌍용대치아파트","jibun":"65","h":364,"bjdong":"10600"},
    {"gu":"강남구","dong":"일원동","name":"개포한신아파트","jibun":"615-1","h":364,"bjdong":"11400"},
    {"gu":"강남구","dong":"압구정동","name":"한양아파트","jibun":"513","h":343,"bjdong":"11000"},
    {"gu":"강남구","dong":"수서동","name":"동익아파트","jibun":"738","h":330,"bjdong":"11500"},
    {"gu":"강남구","dong":"압구정동","name":"미성아파트","jibun":"414","h":322,"bjdong":"11000"},
    {"gu":"강남구","dong":"압구정동","name":"한양아파트","jibun":"489","h":312,"bjdong":"11000"},
    {"gu":"강남구","dong":"압구정동","name":"영동한양아파트","jibun":"493","h":296,"bjdong":"11000"},
    {"gu":"강남구","dong":"일원동","name":"청솔빌리지","jibun":"739","h":291,"bjdong":"11400"},
    {"gu":"강남구","dong":"압구정동","name":"한양아파트","jibun":"486","h":286,"bjdong":"11000"},
    {"gu":"강남구","dong":"개포동","name":"개포6차우성아파트","jibun":"658-1","h":270,"bjdong":"10300"},
    {"gu":"강남구","dong":"개포동","name":"개포8차 우성아파트","jibun":"179","h":261,"bjdong":"10300"},
    {"gu":"강남구","dong":"삼성동","name":"진흥아파트","jibun":"53-2","h":255,"bjdong":"10500"},
    {"gu":"강남구","dong":"청담동","name":"건영아파트","jibun":"108","h":240,"bjdong":"10400"},
    {"gu":"강남구","dong":"압구정동","name":"한양아파트","jibun":"528","h":239,"bjdong":"11000"},
    {"gu":"강남구","dong":"압구정동","name":"압구정동 448번지","jibun":"448","h":234,"bjdong":"11000"},
    {"gu":"강남구","dong":"압구정동","name":"한양아파트","jibun":"484","h":228,"bjdong":"11000"},
    {"gu":"강남구","dong":"압구정동","name":"현대아파트","jibun":"455","h":224,"bjdong":"11000"},
    {"gu":"강남구","dong":"청담동","name":"현대아파트","jibun":"23","h":214,"bjdong":"10400"},
    {"gu":"강남구","dong":"개포동","name":"현대아파트","jibun":"177","h":198,"bjdong":"10300"},
    {"gu":"강남구","dong":"압구정동","name":"현대아파트","jibun":"462","h":170,"bjdong":"11000"},
    {"gu":"강남구","dong":"삼성동","name":"청구아파트","jibun":"78-4","h":167,"bjdong":"10500"},
    {"gu":"강남구","dong":"압구정동","name":"현대아파트","jibun":"436","h":144,"bjdong":"11000"},
    {"gu":"강남구","dong":"대치동","name":"대치동 992번지","jibun":"992","h":120,"bjdong":"10600"},
    {"gu":"강남구","dong":"논현동","name":"쌍용아파트","jibun":"103","h":111,"bjdong":"10800"},
    {"gu":"강남구","dong":"청담동","name":"청담동 130번지","jibun":"130","h":108,"bjdong":"10400"},
    {"gu":"서초구","dong":"내곡동","name":"신반포아파트","jibun":"73","h":1572,"bjdong":"10600"},
    {"gu":"서초구","dong":"내곡동","name":"신반포아파트","jibun":"70","h":1212,"bjdong":"10600"},
    {"gu":"서초구","dong":"반포동","name":"우면주공영구임대아파트","jibun":"63","h":984,"bjdong":"10300"},
    {"gu":"서초구","dong":"잠원동","name":"잠원동 154-2번지","jibun":"154-2","h":794,"bjdong":"10200"},
    {"gu":"서초구","dong":"내곡동","name":"잠원한신아파트","jibun":"56-3","h":540,"bjdong":"10600"},
    {"gu":"서초구","dong":"서초동","name":"방배삼호아파트","jibun":"725","h":481,"bjdong":"10100"},
    {"gu":"서초구","dong":"서초동","name":"방배우성아파트","jibun":"2525","h":468,"bjdong":"10100"},
    {"gu":"서초구","dong":"내곡동","name":"한강아파트","jibun":"49-8","h":450,"bjdong":"10600"},
    {"gu":"서초구","dong":"서초동","name":"삼호아파트","jibun":"770-1","h":420,"bjdong":"10100"},
    {"gu":"서초구","dong":"서초동","name":"임광아파트","jibun":"1015","h":418,"bjdong":"10100"},
    {"gu":"서초구","dong":"반포동","name":"대림아파트","jibun":"57","h":412,"bjdong":"10300"},
    {"gu":"서초구","dong":"내곡동","name":"신반포아파트","jibun":"55-12","h":396,"bjdong":"10600"},
    {"gu":"서초구","dong":"내곡동","name":"강변아파트","jibun":"53-15","h":360,"bjdong":"10600"},
    {"gu":"서초구","dong":"내곡동","name":"신반포청구아파트","jibun":"63-2","h":347,"bjdong":"10600"},
    {"gu":"서초구","dong":"반포동","name":"동고아파트","jibun":"59","h":330,"bjdong":"10300"},
    {"gu":"서초구","dong":"내곡동","name":"신반포아파트","jibun":"50-5","h":324,"bjdong":"10600"},
    {"gu":"서초구","dong":"내곡동","name":"신반포아파트","jibun":"65-32","h":320,"bjdong":"10600"},
    {"gu":"서초구","dong":"반포동","name":"코오롱아파트","jibun":"70","h":300,"bjdong":"10300"},
    {"gu":"서초구","dong":"내곡동","name":"내곡동 51번지","jibun":"51","h":288,"bjdong":"10600"},
    {"gu":"서초구","dong":"반포동","name":"우면한라아파트","jibun":"67","h":252,"bjdong":"10300"},
    {"gu":"서초구","dong":"내곡동","name":"반포한신타워아파트","jibun":"71-11","h":250,"bjdong":"10600"},
    {"gu":"서초구","dong":"내곡동","name":"신반포아파트","jibun":"61-2","h":242,"bjdong":"10600"},
    {"gu":"서초구","dong":"내곡동","name":"잠원현대아파트","jibun":"53","h":238,"bjdong":"10600"},
    {"gu":"서초구","dong":"서초동","name":"쌍용예가클래식","jibun":"776-3","h":216,"bjdong":"10100"},
    {"gu":"서초구","dong":"내곡동","name":"내곡동 63-34번지","jibun":"63-34","h":208,"bjdong":"10600"},
    {"gu":"서초구","dong":"내곡동","name":"신반포아파트","jibun":"61-1","h":169,"bjdong":"10600"},
    {"gu":"서초구","dong":"서초동","name":"방배임광아파트","jibun":"1010-1","h":158,"bjdong":"10100"},
    {"gu":"서초구","dong":"서초동","name":"임광아파트","jibun":"1011-1","h":158,"bjdong":"10100"},
    {"gu":"서초구","dong":"서초동","name":"삼호아파트","jibun":"758-4","h":144,"bjdong":"10100"},
    {"gu":"서초구","dong":"서초동","name":"삼호아파트","jibun":"759-2","h":120,"bjdong":"10100"},
    {"gu":"송파구","dong":"방이동","name":"올림픽선수기자촌","jibun":"89","h":5540,"bjdong":"11100"},
    {"gu":"송파구","dong":"문정동","name":"문정동 150번지","jibun":"150","h":4524,"bjdong":"10800"},
    {"gu":"송파구","dong":"잠실동","name":"잠실동 27번지","jibun":"27","h":3930,"bjdong":"10100"},
    {"gu":"송파구","dong":"잠실동","name":"우성아파트","jibun":"101-1","h":1512,"bjdong":"10100"},
    {"gu":"송파구","dong":"신천동","name":"신천동 11번지","jibun":"11","h":1422,"bjdong":"10200"},
    {"gu":"송파구","dong":"잠실동","name":"잠실동 86번지","jibun":"86","h":1356,"bjdong":"10100"},
    {"gu":"송파구","dong":"문정동","name":"문정동 145번지","jibun":"145","h":1316,"bjdong":"10800"},
    {"gu":"송파구","dong":"오금동","name":"현대아파트(2-4차)","jibun":"43","h":1316,"bjdong":"11100"},
    {"gu":"송파구","dong":"풍납동","name":"한강극동아파트","jibun":"508","h":944,"bjdong":"10300"},
    {"gu":"송파구","dong":"송파동","name":"가락삼익맨숀","jibun":"166","h":936,"bjdong":"10400"},
    {"gu":"송파구","dong":"가락동","name":"가락동 96-1번지","jibun":"96-1","h":935,"bjdong":"10700"},
    {"gu":"송파구","dong":"풍납동","name":"동아한가람아파트","jibun":"506","h":782,"bjdong":"10300"},
    {"gu":"송파구","dong":"오금동","name":"코오롱아파트","jibun":"212-8","h":758,"bjdong":"11100"},
    {"gu":"송파구","dong":"거여동","name":"거여동 165번지","jibun":"165","h":750,"bjdong":"11200"},
    {"gu":"송파구","dong":"송파동","name":"2차한양아파트","jibun":"151","h":744,"bjdong":"10400"},
    {"gu":"송파구","dong":"풍납동","name":"풍납동 413-1번지","jibun":"413-1","h":730,"bjdong":"10300"},
    {"gu":"송파구","dong":"가락동","name":"가락동 199번지","jibun":"199","h":727,"bjdong":"10700"},
    {"gu":"송파구","dong":"가락동","name":"가락동 176번지","jibun":"176","h":648,"bjdong":"10700"},
    {"gu":"송파구","dong":"잠실동","name":"잠실동 320번지","jibun":"320","h":606,"bjdong":"10100"},
    {"gu":"송파구","dong":"송파동","name":"한양아파트","jibun":"119","h":576,"bjdong":"10400"},
    {"gu":"송파구","dong":"가락동","name":"가락동 192번지","jibun":"192","h":555,"bjdong":"10700"},
    {"gu":"송파구","dong":"문정동","name":"건영아파트","jibun":"72-3","h":545,"bjdong":"10800"},
    {"gu":"송파구","dong":"문정동","name":"문정동 3번지","jibun":"3","h":514,"bjdong":"10800"},
    {"gu":"송파구","dong":"방이동","name":"대림아파트","jibun":"217","h":497,"bjdong":"11100"},
    {"gu":"송파구","dong":"오금동","name":"대림아파트","jibun":"2","h":480,"bjdong":"11100"},
    {"gu":"송파구","dong":"가락동","name":"가락동 70-19번지","jibun":"70-19","h":443,"bjdong":"10700"},
    {"gu":"송파구","dong":"가락동","name":"가락동 138번지","jibun":"138","h":435,"bjdong":"10700"},
    {"gu":"송파구","dong":"풍납동","name":"쌍용아파트","jibun":"401-1","h":417,"bjdong":"10300"},
    {"gu":"송파구","dong":"송파동","name":"송파동 161번지","jibun":"161","h":378,"bjdong":"10400"},
    {"gu":"송파구","dong":"잠실동","name":"잠실동 331번지","jibun":"331","h":338,"bjdong":"10100"},
    {"gu":"송파구","dong":"잠실동","name":"잠실동 101-2번지","jibun":"101-2","h":330,"bjdong":"10100"},
    {"gu":"송파구","dong":"송파동","name":"잠실더샵루벤","jibun":"171","h":327,"bjdong":"10400"},
    {"gu":"송파구","dong":"풍납동","name":"극동아파트","jibun":"391","h":307,"bjdong":"10300"},
    {"gu":"송파구","dong":"거여동","name":"거여동 164번지","jibun":"164","h":293,"bjdong":"11200"},
    {"gu":"송파구","dong":"풍납동","name":"미성맨션","jibun":"219","h":275,"bjdong":"10300"},
    {"gu":"송파구","dong":"방이동","name":"한양3아파트","jibun":"225","h":273,"bjdong":"11100"},
    {"gu":"송파구","dong":"거여동","name":"거여동 19번지","jibun":"19","h":269,"bjdong":"11200"},
    {"gu":"송파구","dong":"가락동","name":"가락동 102번지","jibun":"102","h":256,"bjdong":"10700"},
    {"gu":"송파구","dong":"거여동","name":"거여동 160번지","jibun":"160","h":237,"bjdong":"11200"},
    {"gu":"송파구","dong":"송파동","name":"호수 임광 아파트","jibun":"33","h":227,"bjdong":"10400"},
    {"gu":"송파구","dong":"거여동","name":"거여동 166번지","jibun":"166","h":226,"bjdong":"11200"},
    {"gu":"송파구","dong":"가락동","name":"가락동 55번지","jibun":"55","h":160,"bjdong":"10700"},
    {"gu":"송파구","dong":"오금동","name":"오금동 171번지","jibun":"171","h":140,"bjdong":"11100"},
    {"gu":"송파구","dong":"풍납동","name":"신동아아파트","jibun":"220-2","h":135,"bjdong":"10300"},
    {"gu":"송파구","dong":"삼전동","name":"삼전동 39번지","jibun":"39","h":120,"bjdong":"10600"},
    {"gu":"송파구","dong":"문정동","name":"문정동 58번지","jibun":"58","h":108,"bjdong":"10800"},
    {"gu":"송파구","dong":"가락동","name":"가락동 142번지","jibun":"142","h":105,"bjdong":"10700"},
    {"gu":"송파구","dong":"풍납동","name":"현대아파트","jibun":"299-1","h":104,"bjdong":"10300"},
]


def fetch_json(url, timeout=15):
    """JSON API 호출"""
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return None


def get_far_for_complex(lawd_cd, bjdong_cd, jibun):
    """단지의 용적률을 건축물대장에서 조회 (총괄표제부 → 표제부 fallback)"""
    parts = jibun.split('-')
    bun = parts[0].zfill(4)
    ji = (parts[1] if len(parts) > 1 else '0').zfill(4)
    
    result = {'far': 0, 'hhldCnt': 0, 'vlRatEstmTotArea': 0, 'totArea': 0, 'source': ''}
    
    # 1) 총괄표제부
    url = (f"https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo"
           f"?serviceKey={BLD_KEY}&sigunguCd={lawd_cd}&bjdongCd={bjdong_cd}"
           f"&bun={bun}&ji={ji}&numOfRows=10&pageNo=1&_type=json")
    
    data = fetch_json(url)
    if data:
        items = data.get('response', {}).get('body', {}).get('items', {}).get('item')
        if items:
            if not isinstance(items, list):
                items = [items]
            # 공동주택 + 세대수 최대 선택
            apts = [x for x in items if '공동주택' in (x.get('mainPurpsCdNm', '') or '')]
            pool = apts if apts else items
            pool.sort(key=lambda x: -int(x.get('hhldCnt', 0) or 0))
            item = pool[0]
            
            vr = float(item.get('vlRat', 0) or 0)
            if 50 < vr < 500:
                result['far'] = round(vr, 1)
                result['source'] = '총괄표제부'
            result['hhldCnt'] = int(item.get('hhldCnt', 0) or 0)
            result['vlRatEstmTotArea'] = float(item.get('vlRatEstmTotArea', 0) or 0)
            result['totArea'] = float(item.get('totArea', 0) or 0)
    
    # 2) 용적률 못 구했으면 표제부에서 시도
    if result['far'] == 0:
        url2 = (f"https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo"
                f"?serviceKey={BLD_KEY}&sigunguCd={lawd_cd}&bjdongCd={bjdong_cd}"
                f"&bun={bun}&ji={ji}&numOfRows=100&pageNo=1&_type=json")
        
        data2 = fetch_json(url2)
        if data2:
            items2 = data2.get('response', {}).get('body', {}).get('items', {}).get('item')
            if items2:
                if not isinstance(items2, list):
                    items2 = [items2]
                # 주거시설 필터
                residential = [t for t in items2 if '공동주택' in 
                              ((t.get('mainPurpsCdNm', '') or '') + (t.get('etcPurps', '') or ''))]
                targets = residential if residential else items2
                
                # 세대수 합산
                if result['hhldCnt'] == 0:
                    result['hhldCnt'] = sum(int(t.get('hhldCnt', 0) or 0) for t in targets)
                
                # 용적률: 첫 유효값
                for t in targets:
                    vr = float(t.get('vlRat', 0) or 0)
                    if 50 < vr < 500:
                        result['far'] = round(vr, 1)
                        result['source'] = '표제부'
                        break
                
                # vlRatEstmTotArea 합산
                if result['vlRatEstmTotArea'] == 0:
                    result['vlRatEstmTotArea'] = sum(float(t.get('vlRatEstmTotArea', 0) or 0) for t in targets)
                
                # totArea 합산
                if result['totArea'] == 0:
                    result['totArea'] = sum(float(t.get('totArea', 0) or 0) for t in targets)
    
    return result


def main():
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'complexes_master.json')
    
    # 기존 결과 로드 (이어서 실행 가능)
    existing = {}
    if os.path.exists(output_path):
        with open(output_path, 'r', encoding='utf-8') as f:
            existing_list = json.load(f)
            for item in existing_list:
                key = f"{item['gu']}_{item['dong']}_{item['jibun']}"
                existing[key] = item
    
    results = []
    total = len(ALL_COMPLEXES)
    success = 0
    
    for i, c in enumerate(ALL_COMPLEXES):
        key = f"{c['gu']}_{c['dong']}_{c['jibun']}"
        lawd = LAWD_MAP[c['gu']]
        
        # 이미 용적률 확보된 건 스킵
        if key in existing and existing[key].get('far', 0) > 0:
            results.append(existing[key])
            success += 1
            print(f"[{i+1}/{total}] {c['name']} — 캐시 {existing[key]['far']}%")
            continue
        
        print(f"[{i+1}/{total}] {c['name']} ({c['gu']} {c['dong']} {c['jibun']})...", end=' ')
        
        far_data = get_far_for_complex(lawd, c['bjdong'], c['jibun'])
        
        entry = {
            **c,
            'lawd': lawd,
            'far': far_data['far'],
            'hhldCnt': far_data['hhldCnt'] or c['h'],
            'vlRatEstmTotArea': far_data['vlRatEstmTotArea'],
            'totArea': far_data['totArea'],
            'farSource': far_data['source'],
            'type': 'reconstruction',  # 확장성: 'general', 'new' 등 추가 가능
        }
        results.append(entry)
        
        if far_data['far'] > 0:
            success += 1
            print(f"✅ {far_data['far']}% ({far_data['source']})")
        else:
            print(f"❌ 미확보")
        
        # API rate limit 방지
        time.sleep(0.5)
    
    # 저장
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*50}")
    print(f"완료: {success}/{total} 단지 용적률 확보 ({success/total*100:.0f}%)")
    print(f"저장: {output_path}")


if __name__ == '__main__':
    main()
