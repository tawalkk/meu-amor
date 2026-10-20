-- Execute uma vez no SQL Editor do Supabase para ativar as sugestões compartilhadas da playlist.
create table if not exists public.couple_songs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  artist text not null default '' check (char_length(artist) <= 120),
  spotify_url text not null default '' check (char_length(spotify_url) <= 500),
  dedication text not null default '' check (char_length(dedication) <= 800),
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.couple_songs enable row level security;
grant select, insert, update, delete on public.couple_songs to authenticated;

drop policy if exists "couple members can read songs" on public.couple_songs;
create policy "couple members can read songs" on public.couple_songs
  for select to authenticated using (public.is_couple_member());

drop policy if exists "members can suggest songs as themselves" on public.couple_songs;
create policy "members can suggest songs as themselves" on public.couple_songs
  for insert to authenticated with check (public.is_couple_member() and created_by = (select auth.uid()));

drop policy if exists "couple members can choose featured songs" on public.couple_songs;
create policy "couple members can choose featured songs" on public.couple_songs
  for update to authenticated using (public.is_couple_member()) with check (public.is_couple_member());

drop policy if exists "authors can remove their song suggestions" on public.couple_songs;
create policy "authors can remove their song suggestions" on public.couple_songs
  for delete to authenticated using (public.is_couple_member() and created_by = (select auth.uid()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'couple_songs'
  ) then
    alter publication supabase_realtime add table public.couple_songs;
  end if;
end $$;
