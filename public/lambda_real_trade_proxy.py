"""
실거래가 API 프록시 Lambda
- 브라우저 CORS 문제 우회
- aptfinder.net/real_trade.html (매매) 및 rent_trade.html (전월세) 에서 호출

배포: AWS Lambda (Python 3.12, 함수 URL 활성화)
함수명 제안: aptfinder-real-trade-proxy
타임아웃: 30초 (여러 월 조회 시 시간 필요)

사용법:
  매매: ?LAWD_CD=11680&DEAL_YMD=202607
  전월세: ?type=rent&LAWD_CD=11680&DEAL_YMD=202607
"""

import json
import urllib.request
import urllib.parse

API_KEY = 'Q5ESFBIwOv0jBJFO74hayYGsfDZH6Xvz70FGVRXojNTmCuxoXtrvBbXpmwBuAMc2mjbjLFjW7llkX3liqloF4A%3D%3D'

# API 엔드포인트 매핑
API_ENDPOINTS = {
    'trade': 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade',
    'rent': 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent',
}

def lambda_handler(event, context):
    # CORS 헤더
    headers = {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }
    
    # OPTIONS 요청 처리
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    # 쿼리 파라미터 가져오기
    params = event.get('queryStringParameters', {}) or {}
    api_type = params.get('type', 'trade')  # 'trade' (매매) 또는 'rent' (전월세)
    lawd_cd = params.get('LAWD_CD', '11680')
    deal_ymd = params.get('DEAL_YMD', '202607')
    page_no = params.get('pageNo', '1')
    num_of_rows = params.get('numOfRows', '1000')
    
    # API 엔드포인트 결정
    base_url = API_ENDPOINTS.get(api_type, API_ENDPOINTS['trade'])
    
    # API 호출
    url = f"{base_url}?serviceKey={API_KEY}&LAWD_CD={lawd_cd}&DEAL_YMD={deal_ymd}&pageNo={page_no}&numOfRows={num_of_rows}"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=25) as response:
            body = response.read().decode('utf-8')
            return {
                'statusCode': 200,
                'headers': headers,
                'body': body
            }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': f'<error>{str(e)}</error>'
        }
