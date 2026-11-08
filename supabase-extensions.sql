-- BLOX Video Library - Extensions + Search + Full-text
-- รันใน Supabase Dashboard > SQL Editor > New Query > Run

-- 1. ส่วนขยายที่ต้องใช้
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- 2. เพิ่มคอลัมน์ค้นหา (ถ้ายังไม่มี)
alter table public.videos add column if not exists search_vector tsvector;
alter table public.videos add column if not exists view_count int default 0;
alter table public.videos add column if not exists is_featured boolean default false;

-- 3. Index ค้นหาเร็ว
create index if not exists videos_title_trgm_idx on public.videos using gin (title gin_trgm_ops);
create index if not exists videos_search_idx on public.videos using gin (search_vector);
create index if not exists videos_status_published_idx on public.videos (status, published_at desc) where status = 'published';

-- 4. อัปเดต search_vector อัตโนมัติ
create or replace function public.update_video_search() returns trigger as $$
begin
  new.search_vector := to_tsvector('simple', coalesce(new.title,'') || ' ' || coalesce(new.description,''));
  return new;
end;
$$ language plpgsql;

drop trigger if exists videos_search_trigger on public.videos;
create trigger videos_search_trigger before insert or update on public.videos
for each row execute function public.update_video_search();

-- 5. ฟังก์ชันค้นหา + นับวิว
create or replace function public.search_videos(p_q text, p_category_id uuid)
returns setof public.videos as $$
begin
  return query
  select * from public.videos
  where status = 'published'
  and (p_q is null or p_q = '' or title ilike '%' || p_q || '%' or description ilike '%' || p_q || '%')
  and (p_category_id is null or category_id = p_category_id)
  order by published_at desc;
end;
$$ language plpgsql security definer;

create or replace function public.increment_view(p_video_id uuid)
returns void as $$
begin
  update public.videos set view_count = view_count + 1 where id = p_video_id;
end;
$$ language plpgsql security definer;

-- 6. อัปเดตข้อมูลเก่า
update public.videos set search_vector = to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''));
