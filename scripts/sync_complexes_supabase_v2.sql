-- ============================================================
-- AptFinder complexes 싱크 v2 — 오늘자 티커 마스터 38개 기준(SoT)
-- 지번(bjdong+jibun) 매칭: 있으면 UPDATE, 없으면 INSERT
-- 정리방식 A: 재건축 38개 complex_type='재건축', 나머지 '일반' 유지(삭제 안 함)
-- 시공사(constructor)는 SET 대상에서 제외 → 기존값 보존, 없으면 NULL(나중에 업데이트)
-- 재실행 안전(지번 기준 멱등), 트랜잭션 보호
-- ============================================================

BEGIN;

UPDATE complexes SET ticker='APHD6-7', short_name='압구정현대6-7', name='현대6·7차', dong='압구정동', jibun='456', bjdong='11000', total_units=1340, complex_type='재건축' WHERE bjdong='11000' AND jibun='456';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '현대6·7차','압구정동','456','11000','APHD6-7','압구정현대6-7',1340,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='456');
UPDATE complexes SET ticker='APHD1-2', short_name='압구정현대1-2', name='현대1·2차', dong='압구정동', jibun='369-1', bjdong='11000', total_units=960, complex_type='재건축' WHERE bjdong='11000' AND jibun='369-1';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '현대1·2차','압구정동','369-1','11000','APHD1-2','압구정현대1-2',960,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='369-1');
UPDATE complexes SET ticker='APHY1', short_name='압구정한양1', name='한양1차', dong='압구정동', jibun='490', bjdong='11000', total_units=936, complex_type='재건축' WHERE bjdong='11000' AND jibun='490';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '한양1차','압구정동','490','11000','APHY1','압구정한양1',936,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='490');
UPDATE complexes SET ticker='APMS1', short_name='압구정미성1', name='미성1차', dong='압구정동', jibun='397', bjdong='11000', total_units=910, complex_type='재건축' WHERE bjdong='11000' AND jibun='397';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '미성1차','압구정동','397','11000','APMS1','압구정미성1',910,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='397');
UPDATE complexes SET ticker='APNHD', short_name='압구정신현대', name='신현대', dong='압구정동', jibun='426', bjdong='11000', total_units=600, complex_type='재건축' WHERE bjdong='11000' AND jibun='426';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '신현대','압구정동','426','11000','APNHD','압구정신현대',600,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='426');
UPDATE complexes SET ticker='APHD8', short_name='압구정현대8', name='현대8차', dong='압구정동', jibun='481', bjdong='11000', total_units=516, complex_type='재건축' WHERE bjdong='11000' AND jibun='481';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '현대8차','압구정동','481','11000','APHD8','압구정현대8',516,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='481');
UPDATE complexes SET ticker='APHD3', short_name='압구정현대3', name='현대3차', dong='압구정동', jibun='443', bjdong='11000', total_units=432, complex_type='재건축' WHERE bjdong='11000' AND jibun='443';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '현대3차','압구정동','443','11000','APHD3','압구정현대3',432,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='443');
UPDATE complexes SET ticker='APHD14', short_name='압구정현대14', name='현대14차', dong='압구정동', jibun='447', bjdong='11000', total_units=388, complex_type='재건축' WHERE bjdong='11000' AND jibun='447';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '현대14차','압구정동','447','11000','APHD14','압구정현대14',388,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='447');
UPDATE complexes SET ticker='APHY5', short_name='압구정한양5', name='한양5차', dong='압구정동', jibun='513', bjdong='11000', total_units=343, complex_type='재건축' WHERE bjdong='11000' AND jibun='513';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '한양5차','압구정동','513','11000','APHY5','압구정한양5',343,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='513');
UPDATE complexes SET ticker='APMS2', short_name='압구정미성2', name='미성2차', dong='압구정동', jibun='414', bjdong='11000', total_units=322, complex_type='재건축' WHERE bjdong='11000' AND jibun='414';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '미성2차','압구정동','414','11000','APMS2','압구정미성2',322,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='414');
UPDATE complexes SET ticker='APHY3', short_name='압구정한양3', name='한양3차', dong='압구정동', jibun='489', bjdong='11000', total_units=312, complex_type='재건축' WHERE bjdong='11000' AND jibun='489';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '한양3차','압구정동','489','11000','APHY3','압구정한양3',312,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='489');
UPDATE complexes SET ticker='APHY2', short_name='압구정한양2', name='한양2차', dong='압구정동', jibun='493', bjdong='11000', total_units=296, complex_type='재건축' WHERE bjdong='11000' AND jibun='493';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '한양2차','압구정동','493','11000','APHY2','압구정한양2',296,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='493');
UPDATE complexes SET ticker='APHY4', short_name='압구정한양4', name='한양4차', dong='압구정동', jibun='486', bjdong='11000', total_units=286, complex_type='재건축' WHERE bjdong='11000' AND jibun='486';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '한양4차','압구정동','486','11000','APHY4','압구정한양4',286,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='486');
UPDATE complexes SET ticker='APHY7', short_name='압구정한양7', name='한양7차', dong='압구정동', jibun='528', bjdong='11000', total_units=239, complex_type='재건축' WHERE bjdong='11000' AND jibun='528';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '한양7차','압구정동','528','11000','APHY7','압구정한양7',239,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='528');
UPDATE complexes SET ticker='APHD13', short_name='압구정현대13', name='현대13차', dong='압구정동', jibun='448', bjdong='11000', total_units=234, complex_type='재건축' WHERE bjdong='11000' AND jibun='448';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '현대13차','압구정동','448','11000','APHD13','압구정현대13',234,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='448');
UPDATE complexes SET ticker='APHY6', short_name='압구정한양6', name='한양6차', dong='압구정동', jibun='484', bjdong='11000', total_units=228, complex_type='재건축' WHERE bjdong='11000' AND jibun='484';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '한양6차','압구정동','484','11000','APHY6','압구정한양6',228,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='484');
UPDATE complexes SET ticker='APHD5', short_name='압구정현대5', name='현대5차', dong='압구정동', jibun='455', bjdong='11000', total_units=224, complex_type='재건축' WHERE bjdong='11000' AND jibun='455';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '현대5차','압구정동','455','11000','APHD5','압구정현대5',224,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='455');
UPDATE complexes SET ticker='APHD4', short_name='압구정현대4', name='현대4차', dong='압구정동', jibun='462', bjdong='11000', total_units=170, complex_type='재건축' WHERE bjdong='11000' AND jibun='462';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '현대4차','압구정동','462','11000','APHD4','압구정현대4',170,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='462');
UPDATE complexes SET ticker='APHD10', short_name='압구정현대10', name='현대10차', dong='압구정동', jibun='436', bjdong='11000', total_units=144, complex_type='재건축' WHERE bjdong='11000' AND jibun='436';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '현대10차','압구정동','436','11000','APHD10','압구정현대10',144,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11000' AND jibun='436');
UPDATE complexes SET ticker='GP6-7', short_name='개포6-7', name='개포주공6·7단지', dong='개포동', jibun='185', bjdong='10300', total_units=1960, complex_type='재건축' WHERE bjdong='10300' AND jibun='185';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '개포주공6·7단지','개포동','185','10300','GP6-7','개포6-7',1960,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10300' AND jibun='185');
UPDATE complexes SET ticker='GP5', short_name='개포5', name='개포주공5단지', dong='개포동', jibun='187', bjdong='10300', total_units=940, complex_type='재건축' WHERE bjdong='10300' AND jibun='187';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '개포주공5단지','개포동','187','10300','GP5','개포5',940,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10300' AND jibun='187');
UPDATE complexes SET ticker='GPHS', short_name='개포한신', name='개포한신', dong='일원동', jibun='615-1', bjdong='11400', total_units=364, complex_type='재건축' WHERE bjdong='11400' AND jibun='615-1';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '개포한신','일원동','615-1','11400','GPHS','개포한신',364,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11400' AND jibun='615-1');
UPDATE complexes SET ticker='GPKNM', short_name='경남', name='경남아파트', dong='개포동', jibun='649', bjdong='10300', total_units=675, complex_type='재건축' WHERE bjdong='10300' AND jibun='649';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '경남아파트','개포동','649','10300','GPKNM','경남',675,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10300' AND jibun='649');
UPDATE complexes SET ticker='DCGPWS2', short_name='대치개포우성2', name='대치개포우성2차', dong='대치동', jibun='500', bjdong='10600', total_units=450, complex_type='재건축' WHERE bjdong='10600' AND jibun='500';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '대치개포우성2차','대치동','500','10600','DCGPWS2','대치개포우성2',450,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10600' AND jibun='500');
UPDATE complexes SET ticker='GPWS3', short_name='개포우성3', name='개포우성3차', dong='개포동', jibun='652', bjdong='10300', total_units=405, complex_type='재건축' WHERE bjdong='10300' AND jibun='652';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '개포우성3차','개포동','652','10300','GPWS3','개포우성3',405,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10300' AND jibun='652');
UPDATE complexes SET ticker='GPHD1', short_name='개포현대1', name='개포현대1차', dong='개포동', jibun='653', bjdong='10300', total_units=416, complex_type='재건축' WHERE bjdong='10300' AND jibun='653';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '개포현대1차','개포동','653','10300','GPHD1','개포현대1',416,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10300' AND jibun='653');
UPDATE complexes SET ticker='DGPHS', short_name='도곡개포한신', name='도곡개포한신', dong='도곡동', jibun='464', bjdong='10500', total_units=620, complex_type='재건축' WHERE bjdong='10500' AND jibun='464';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '도곡개포한신','도곡동','464','10500','DGPHS','도곡개포한신',620,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10500' AND jibun='464');
UPDATE complexes SET ticker='GPWS6', short_name='개포우성6', name='개포우성6차', dong='개포동', jibun='658-1', bjdong='10300', total_units=270, complex_type='재건축' WHERE bjdong='10300' AND jibun='658-1';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '개포우성6차','개포동','658-1','10300','GPWS6','개포우성6',270,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10300' AND jibun='658-1');
UPDATE complexes SET ticker='GPWS8', short_name='개포우성8', name='개포우성8차', dong='개포동', jibun='179', bjdong='10300', total_units=261, complex_type='재건축' WHERE bjdong='10300' AND jibun='179';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '개포우성8차','개포동','179','10300','GPWS8','개포우성8',261,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10300' AND jibun='179');
UPDATE complexes SET ticker='GPHD3', short_name='개포현대3', name='개포현대3차', dong='개포동', jibun='177', bjdong='10300', total_units=198, complex_type='재건축' WHERE bjdong='10300' AND jibun='177';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '개포현대3차','개포동','177','10300','GPHD3','개포현대3',198,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10300' AND jibun='177');
UPDATE complexes SET ticker='EM', short_name='은마', name='은마아파트', dong='대치동', jibun='316', bjdong='10600', total_units=4424, complex_type='재건축' WHERE bjdong='10600' AND jibun='316';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '은마아파트','대치동','316','10600','EM','은마',4424,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10600' AND jibun='316');
UPDATE complexes SET ticker='MIDO', short_name='미도', name='미도맨션아파트', dong='대치동', jibun='511', bjdong='10600', total_units=2435, complex_type='재건축' WHERE bjdong='10600' AND jibun='511';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '미도맨션아파트','대치동','511','10600','MIDO','미도',2435,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10600' AND jibun='511');
UPDATE complexes SET ticker='SK', short_name='선경', name='선경아파트', dong='대치동', jibun='506', bjdong='10600', total_units=1033, complex_type='재건축' WHERE bjdong='10600' AND jibun='506';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '선경아파트','대치동','506','10600','SK','선경',1033,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10600' AND jibun='506');
UPDATE complexes SET ticker='DCGPWS1', short_name='대치개포우성1', name='대치개포1차우성', dong='대치동', jibun='503', bjdong='10600', total_units=690, complex_type='재건축' WHERE bjdong='10600' AND jibun='503';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '대치개포1차우성','대치동','503','10600','DCGPWS1','대치개포우성1',690,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10600' AND jibun='503');
UPDATE complexes SET ticker='DCSS1', short_name='대치쌍용1', name='대치쌍용1차', dong='대치동', jibun='66', bjdong='10600', total_units=630, complex_type='재건축' WHERE bjdong='10600' AND jibun='66';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '대치쌍용1차','대치동','66','10600','DCSS1','대치쌍용1',630,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10600' AND jibun='66');
UPDATE complexes SET ticker='DCWS1', short_name='대치우성1', name='대치우성1차', dong='대치동', jibun='63', bjdong='10600', total_units=476, complex_type='재건축' WHERE bjdong='10600' AND jibun='63';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '대치우성1차','대치동','63','10600','DCWS1','대치우성1',476,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10600' AND jibun='63');
UPDATE complexes SET ticker='DCSS2', short_name='대치쌍용2', name='대치쌍용2차', dong='대치동', jibun='65', bjdong='10600', total_units=364, complex_type='재건축' WHERE bjdong='10600' AND jibun='65';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '대치쌍용2차','대치동','65','10600','DCSS2','대치쌍용2',364,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='10600' AND jibun='65');
UPDATE complexes SET ticker='ILWS7', short_name='일원우성7', name='일원동우성7차', dong='일원동', jibun='615', bjdong='11400', total_units=802, complex_type='재건축' WHERE bjdong='11400' AND jibun='615';
INSERT INTO complexes (name, dong, jibun, bjdong, ticker, short_name, total_units, complex_type) SELECT '일원동우성7차','일원동','615','11400','ILWS7','일원우성7',802,'재건축' WHERE NOT EXISTS (SELECT 1 FROM complexes WHERE bjdong='11400' AND jibun='615');

COMMIT;

-- 확인
SELECT ticker, short_name, name, dong, jibun, total_units, constructor, complex_type FROM complexes WHERE ticker IS NOT NULL ORDER BY dong, ticker;
SELECT complex_type, COUNT(*) FROM complexes GROUP BY complex_type;
