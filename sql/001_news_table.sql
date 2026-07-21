-- News feed storage. Run this in the Supabase SQL editor.
--
-- Body is jsonb holding the same block array the code already renders:
--   {t:"p"|"h"|"sub"|"note"}  prose
--   {t:"m"}                   matchup with two team cards
--   {t:"standings"|"odds"|"chart"}  charts
-- Keeping it as jsonb means new block types need no migration.

create table if not exists public.news (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  headline       text not null,
  dek            text,
  author         text not null,
  author_type    text not null default 'human',   -- 'human' | 'auto'
  published_date date not null,
  body           jsonb not null default '[]'::jsonb,
  is_published   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists news_published_idx
  on public.news (is_published, published_date desc);

-- keep updated_at honest
create or replace function public.touch_news_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists news_touch_updated_at on public.news;
create trigger news_touch_updated_at
  before update on public.news
  for each row execute function public.touch_news_updated_at();

alter table public.news enable row level security;

-- Anyone may read a published story.
drop policy if exists "news: public read published" on public.news;
create policy "news: public read published"
  on public.news for select
  using (is_published = true);

-- TEMPORARY, and deliberately permissive.
--
-- The Admin gate is a password checked in the browser, and that password ships
-- inside the JavaScript bundle. This policy therefore lets ANY visitor read
-- drafts and write news rows. It is here so the editor works before auth exists.
--
-- To close it, add Supabase Auth and replace both policies below with
--   using (auth.uid() = '<your-user-uuid>')
-- or a role check. Until then, treat news content as publicly writable.
drop policy if exists "news: temp open read drafts" on public.news;
create policy "news: temp open read drafts"
  on public.news for select
  using (true);

drop policy if exists "news: temp open write" on public.news;
create policy "news: temp open write"
  on public.news for all
  using (true) with check (true);
