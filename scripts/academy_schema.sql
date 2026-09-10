-- ============================================================
-- 학원 매물 (임대차) 전용 스키마
-- Supabase SQL 에디터에서 실행
-- ============================================================

-- 1) 매물 테이블
create table if not exists academy_listings (
  id            text primary key,                 -- ACAD-0001 형식 (관리화면 생성 ID 유지)
  title         text,
  dong          text,
  road_address  text,
  lot_address   text,
  building_name text,
  raw_property  text,
  floor         text,                              -- "6", "지하1", "408호", "3-4" 등 → 문자
  area_m2       numeric,
  area_py       numeric,
  area_m2_contract numeric,
  area_py_contract numeric,
  deposit_manwon      numeric,
  monthly_rent_manwon numeric,
  premium_manwon      numeric,                     -- 관리자 전용
  maintenance_manwon  numeric,
  approval_year int,
  tag           text,                              -- 관리자 전용(담당)
  memo          text,                              -- 관리자 전용
  received_date date,
  expiry_date   date,
  usage         text,                              -- 학원/교습소/스터디카페/기타
  rooms         jsonb default '[]'::jsonb,         -- [{name, capacity}]
  restrooms     jsonb default '{}'::jsonb,         -- {count, location, gender}
  facility_transfer text,                          -- 가능/불가/협의
  has_license   text,                              -- 있음/없음
  elevator_count int,
  parking_count int,
  photos        jsonb default '[]'::jsonb,         -- [{url, w, h}] (Storage URL)
  public_fields jsonb default '{}'::jsonb,         -- 필드별 공개여부
  status        text default 'active',             -- active/pending/closed
  lat           numeric,
  lng           numeric,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_academy_dong on academy_listings(dong);
create index if not exists idx_academy_status on academy_listings(status);

-- updated_at 자동 갱신
create or replace function set_academy_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists trg_academy_updated on academy_listings;
create trigger trg_academy_updated before update on academy_listings
  for each row execute function set_academy_updated_at();

-- 2) 커스텀 뷰 (사용자별 매물 세트)
create table if not exists academy_views (
  name        text primary key,                    -- 뷰 이름 (예: 김원장님용)
  ids         jsonb default '[]'::jsonb,            -- 포함 매물 id 배열
  created_at  timestamptz default now(),
  share_token      text,                            -- 공개 공유 링크 토큰 (추측 불가 랜덤)
  share_created_at timestamptz,                     -- 공유 링크 생성 시각
  share_expires_at timestamptz                      -- 공유 만료 시각 (null = 무기한)
);
create unique index if not exists academy_views_share_token_idx
  on academy_views (share_token) where share_token is not null;

-- 3) 전역 설정 (히트맵 표시항목 등) — 단일 행
create table if not exists academy_settings (
  id            int primary key default 1,
  heatmap_display jsonb default '{}'::jsonb,
  updated_at    timestamptz default now(),
  constraint academy_settings_single check (id = 1)
);
insert into academy_settings (id, heatmap_display)
  values (1, '{}'::jsonb) on conflict (id) do nothing;

-- ============================================================
-- RLS: 공개 read, 인증(관리자) write
-- ============================================================
alter table academy_listings enable row level security;
alter table academy_views    enable row level security;
alter table academy_settings enable row level security;

-- 읽기: 누구나 (히트맵 공개용). 단 관리자 전용 필드는 프론트에서 마스킹.
drop policy if exists academy_listings_read on academy_listings;
create policy academy_listings_read on academy_listings for select using (true);
drop policy if exists academy_views_read on academy_views;
create policy academy_views_read on academy_views for select using (true);
drop policy if exists academy_settings_read on academy_settings;
create policy academy_settings_read on academy_settings for select using (true);

-- 쓰기: 로그인한 사용자(관리자)만
drop policy if exists academy_listings_write on academy_listings;
create policy academy_listings_write on academy_listings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists academy_views_write on academy_views;
create policy academy_views_write on academy_views for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists academy_settings_write on academy_settings;
create policy academy_settings_write on academy_settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- Storage: 사진 버킷 (공개 읽기)
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('academy-photos', 'academy-photos', true)
  on conflict (id) do nothing;

-- 사진 읽기: 공개 / 업로드·삭제: 인증 사용자
drop policy if exists academy_photos_read on storage.objects;
create policy academy_photos_read on storage.objects for select
  using (bucket_id = 'academy-photos');
drop policy if exists academy_photos_write on storage.objects;
create policy academy_photos_write on storage.objects for insert
  with check (bucket_id = 'academy-photos' and auth.role() = 'authenticated');
drop policy if exists academy_photos_delete on storage.objects;
create policy academy_photos_delete on storage.objects for delete
  using (bucket_id = 'academy-photos' and auth.role() = 'authenticated');
