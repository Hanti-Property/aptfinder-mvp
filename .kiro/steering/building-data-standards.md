---
inclusion: fileMatch
fileMatchPattern: "**/*rvi*|**/*dashboard*|**/*index*|**/*apartment*|**/*building*"
---

# 건축물 데이터 처리 표준 규칙

`admin_index_dashboard.html`의 데이터 처리 방식이 가장 완성도가 높으므로, 모든 모듈에서 이 방식을 기준으로 따른다.

## 기준 모듈

`public/admin_index_dashboard.html` — 단지 인덱스 대시보드

## 핵심 규칙

### 1. 건축물대장 조회: 총괄표제부 + 표제부 병합

반드시 두 API를 함께 사용한다:
- **총괄표제부** (`getBrRecapTitleInfo`): 단지 전체 요약
- **표제부** (`getBrTitleInfo`): 동별 상세 (준공일, 층수, 세대수 등)

총괄표제부에 값이 비어있으면 표제부에서 보완한다. 이 패턴은 `mergeBuildingData()` 함수를 참조한다.

### 2. 다건 반환 시 선택 로직

총괄표제부가 여러 건 반환될 때 (상가동 + 아파트 혼재):
1. `mainPurpsCdNm === '공동주택'` 필터 우선
2. `hhldCnt` (세대수) 최대값 선택
3. 동일 세대수면 `totArea` (연면적) 최대값 선택

### 3. 준공년도 산출 우선순위

```
1순위: 총괄표제부 useAprDay (비어있지 않고 4자리 이상)
2순위: 표제부 호출 → 주거시설 동 필터 → 가장 이른 useAprDay
3순위: 실거래 데이터 buildYear (최종 fallback — 부정확할 수 있음)
```

**주의**: 실거래 `buildYear`는 해당 필지에 나중에 지어진 건물(상가, 리모델링)의 값이 섞일 수 있으므로 최종 fallback으로만 사용한다.

### 4. 표제부 주거시설 필터

표제부에서 동 목록을 필터할 때:
```javascript
const residential = titleItems.filter(t => {
  const p = (t.etcPurps || '').trim();
  return p === '주거시설' || p === '아파트' || p === '공동주택' 
    || (t.mainPurpsCdNm || '') === '공동주택';
});
const targets = residential.length > 0 ? residential : titleItems;
```

### 5. 세대수 보완

총괄표제부 `hhldCnt`가 0이면 → 표제부 동별 `hhldCnt` 합산

### 6. 용적률 산출 우선순위

```
1순위: 총괄표제부 vlRat (직접 제공값, 0이 아닌 경우)
2순위: vlRatEstmTotArea / V-World lndpclAr × 100
3순위: archArea / bcRat 역산으로 대지면적 추정 → 용적률 계산
4순위: totArea / V-World lndpclAr × 100
+ 범위 검증: 50~500% 밖이면 산출불가 처리
```

### 7. 대지면적 산출

```
1순위: V-World 토지특성 lndpclAr (가장 최신 stdrYear)
2순위: 건축물대장 platArea (대부분 0이므로 fallback)
+ 다필지 보정: LPS 6평 미만이면 vlRatEstmTotArea / 2.5 로 역산
```

### 8. 연면적·용적률산정연면적 보완

총괄표제부에 `totArea=0` 또는 `vlRatEstmTotArea=0`이면 → 표제부 동별 합산

### 9. 이상치 검증

| 항목 | 유효 범위 | 범위 밖 처리 |
|------|----------|------------|
| 용적률 | 50~500% | 산출불가 처리 |
| LPS | 6평 이상 | 다필지 보정 적용 |
| totArea | < 100,000,000 ㎡ | 데이터 오류로 제외 |
| 준공년도 | 1960~2000 (재건축 대상) | 재검증 필요 |

## 적용 대상 파일

- `public/reconstruction_rvi.html` — 재건축 RVI 대시보드
- `public/admin_index_dashboard.html` — 단지 인덱스 대시보드 (기준)
- 향후 추가되는 모든 단지 정보 관련 모듈
