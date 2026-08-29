-- ============================================================
-- AptFinder: complexes 테이블 티커/지번 연결 마이그레이션 (1단계)
-- 생성일: 2026-08-29
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여넣기 후 Run
-- 안전: 컬럼 추가는 IF NOT EXISTS, 데이터는 UPDATE(기존 행 보존)
-- ============================================================

-- 1) 연결 컬럼 추가 (이미 있으면 무시)
ALTER TABLE complexes ADD COLUMN IF NOT EXISTS ticker      text;
ALTER TABLE complexes ADD COLUMN IF NOT EXISTS short_name  text;
ALTER TABLE complexes ADD COLUMN IF NOT EXISTS jibun       text;
ALTER TABLE complexes ADD COLUMN IF NOT EXISTS bjdong      text;

-- ticker 유니크 인덱스 (대소문자 무관: 대문자 정규화 저장 전제)
CREATE UNIQUE INDEX IF NOT EXISTS complexes_ticker_uidx ON complexes (upper(ticker)) WHERE ticker IS NOT NULL;

-- 2) 단지별 티커 매핑 (단지명 또는 동+지번 기준 UPDATE)
--    a안: 자체DB 등록명(complexes_master의 name)으로 매칭 시도
--    이름이 다르면 매칭 실패 → 하단 미매칭 리포트 쿼리로 확인 후 수동 보정

UPDATE complexes SET ticker='APHD6-7', short_name='압구정현대6-7', jibun='456', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('압구정현대6-7','현대6·7차');
UPDATE complexes SET ticker='APHD1-2', short_name='압구정현대1-2', jibun='369-1', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('압구정현대1-2','현대1·2차');
UPDATE complexes SET ticker='APHY1', short_name='압구정한양1', jibun='490', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('한양1차','압구정한양1');
UPDATE complexes SET ticker='APMS1', short_name='압구정미성1', jibun='397', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('압구정미성1','미성1차');
UPDATE complexes SET ticker='APNHD', short_name='압구정신현대', jibun='426', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('압구정신현대','현대아파트(신현대)','신현대');
UPDATE complexes SET ticker='APHD8', short_name='압구정현대8', jibun='481', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('압구정현대8','현대8차');
UPDATE complexes SET ticker='APHD3', short_name='압구정현대3', jibun='443', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('압구정현대3','현대3차');
UPDATE complexes SET ticker='APHD14', short_name='압구정현대14', jibun='447', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('압구정현대14','현대14차');
UPDATE complexes SET ticker='APHY5', short_name='압구정한양5', jibun='513', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('한양5차','압구정한양5');
UPDATE complexes SET ticker='APMS2', short_name='압구정미성2', jibun='414', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('압구정미성2','미성2차');
UPDATE complexes SET ticker='APHY3', short_name='압구정한양3', jibun='489', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('압구정한양3','한양3차');
UPDATE complexes SET ticker='APHY2', short_name='압구정한양2', jibun='493', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('압구정한양2','한양2차');
UPDATE complexes SET ticker='APHY4', short_name='압구정한양4', jibun='486', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('한양4차','압구정한양4');
UPDATE complexes SET ticker='APHY7', short_name='압구정한양7', jibun='528', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('한양7차','압구정한양7');
UPDATE complexes SET ticker='APHD13', short_name='압구정현대13', jibun='448', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('현대13차','압구정현대13');
UPDATE complexes SET ticker='APHY6', short_name='압구정한양6', jibun='484', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('한양6차','압구정한양6');
UPDATE complexes SET ticker='APHD5', short_name='압구정현대5', jibun='455', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('현대5차','압구정현대5');
UPDATE complexes SET ticker='APHD4', short_name='압구정현대4', jibun='462', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('현대4차','압구정현대4');
UPDATE complexes SET ticker='APHD10', short_name='압구정현대10', jibun='436', bjdong='11000' WHERE ticker IS NULL AND dong='압구정동' AND name IN ('압구정현대10','현대10차');
UPDATE complexes SET ticker='GP6-7', short_name='개포6-7', jibun='185', bjdong='10300' WHERE ticker IS NULL AND dong='개포동' AND name IN ('개포주공6·7단지','개포6-7');
UPDATE complexes SET ticker='GP5', short_name='개포5', jibun='187', bjdong='10300' WHERE ticker IS NULL AND dong='개포동' AND name IN ('개포주공5단지','개포5');
UPDATE complexes SET ticker='GPHS', short_name='개포한신', jibun='615-1', bjdong='11400' WHERE ticker IS NULL AND dong='일원동' AND name IN ('개포한신');
UPDATE complexes SET ticker='GPKNM', short_name='경남', jibun='649', bjdong='10300' WHERE ticker IS NULL AND dong='개포동' AND name IN ('경남아파트','경남');
UPDATE complexes SET ticker='DCGPWS2', short_name='대치개포우성2', jibun='500', bjdong='10600' WHERE ticker IS NULL AND dong='대치동' AND name IN ('대치개포우성2차','개포2차우성아파트','대치개포우성2');
UPDATE complexes SET ticker='GPWS3', short_name='개포우성3', jibun='652', bjdong='10300' WHERE ticker IS NULL AND dong='개포동' AND name IN ('개포우성3차','우성아파트','개포우성3');
UPDATE complexes SET ticker='GPHD1', short_name='개포현대1', jibun='653', bjdong='10300' WHERE ticker IS NULL AND dong='개포동' AND name IN ('개포현대1','개포현대1차','현대아파트');
UPDATE complexes SET ticker='DGPHS', short_name='도곡개포한신', jibun='464', bjdong='10500' WHERE ticker IS NULL AND dong='도곡동' AND name IN ('도곡개포한신');
UPDATE complexes SET ticker='GPWS6', short_name='개포우성6', jibun='658-1', bjdong='10300' WHERE ticker IS NULL AND dong='개포동' AND name IN ('개포우성6','개포6차우성아파트','개포우성6차');
UPDATE complexes SET ticker='GPWS8', short_name='개포우성8', jibun='179', bjdong='10300' WHERE ticker IS NULL AND dong='개포동' AND name IN ('개포8차 우성아파트','개포우성8차','개포우성8');
UPDATE complexes SET ticker='GPHD3', short_name='개포현대3', jibun='177', bjdong='10300' WHERE ticker IS NULL AND dong='개포동' AND name IN ('개포현대3','개포현대3차','현대3차');
UPDATE complexes SET ticker='EM', short_name='은마', jibun='316', bjdong='10600' WHERE ticker IS NULL AND dong='대치동' AND name IN ('은마아파트','은마');
UPDATE complexes SET ticker='MIDO', short_name='미도', jibun='511', bjdong='10600' WHERE ticker IS NULL AND dong='대치동' AND name IN ('미도','미도맨션아파트');
UPDATE complexes SET ticker='SK', short_name='선경', jibun='506', bjdong='10600' WHERE ticker IS NULL AND dong='대치동' AND name IN ('선경','선경아파트');
UPDATE complexes SET ticker='DCGPWS1', short_name='대치개포우성1', jibun='503', bjdong='10600' WHERE ticker IS NULL AND dong='대치동' AND name IN ('대치개포1차우성','개포1차우성아파트','대치개포우성1');
UPDATE complexes SET ticker='DCSS1', short_name='대치쌍용1', jibun='66', bjdong='10600' WHERE ticker IS NULL AND dong='대치동' AND name IN ('쌍용대치아파트','대치쌍용1차','대치쌍용1');
UPDATE complexes SET ticker='DCWS1', short_name='대치우성1', jibun='63', bjdong='10600' WHERE ticker IS NULL AND dong='대치동' AND name IN ('대치우성1차','대치우성1','대치우성아파트');
UPDATE complexes SET ticker='DCSS2', short_name='대치쌍용2', jibun='65', bjdong='10600' WHERE ticker IS NULL AND dong='대치동' AND name IN ('쌍용대치아파트','대치쌍용2차','대치쌍용2');
UPDATE complexes SET ticker='ILWS7', short_name='일원우성7', jibun='615', bjdong='11400' WHERE ticker IS NULL AND dong='일원동' AND name IN ('일원동우성7차아파트','일원우성7','일원동우성7차');

-- 3) 매칭 확인 쿼리
--    (a) 티커가 매핑된 단지
SELECT ticker, short_name, name, dong, jibun FROM complexes WHERE ticker IS NOT NULL ORDER BY dong, ticker;
--    (b) 티커 미매핑 단지 (수동 보정 대상)
SELECT id, name, dong FROM complexes WHERE ticker IS NULL ORDER BY dong, name;
