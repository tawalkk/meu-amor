create table if not exists public.couple_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz not null default now()
);

alter table public.couple_members
  add column if not exists username text;

create unique index if not exists couple_members_username_key
  on public.couple_members (lower(username))
  where username is not null;

insert into public.couple_members (user_id, username)
select
  id,
  case email
    when 'kahique@meu-amor.invalid' then 'kahique'
    when 'lalavs@meu-amor.invalid' then 'lalavs'
  end
from auth.users
where email in ('kahique@meu-amor.invalid', 'lalavs@meu-amor.invalid')
on conflict (user_id) do update
set username = excluded.username;

create or replace function public.resolve_couple_login(p_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from auth.users as u
  join public.couple_members as m on m.user_id = u.id
  where lower(m.username) = lower(trim(p_username))
  limit 1;
$$;

revoke all on function public.resolve_couple_login(text) from public, anon, authenticated;
grant execute on function public.resolve_couple_login(text) to anon, authenticated;

create table if not exists public.couple_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null default '',
  media_path text,
  media_type text,
  created_at timestamptz not null default now()
);

alter table public.couple_messages
  add column if not exists media_path text,
  add column if not exists media_type text;

alter table public.couple_messages
  alter column message set default '';

alter table public.couple_messages
  drop constraint if exists couple_messages_message_check,
  drop constraint if exists couple_messages_content_check,
  drop constraint if exists couple_messages_media_pair_check;

alter table public.couple_messages
  add constraint couple_messages_content_check
    check (
      char_length(message) <= 300
      and (char_length(message) > 0 or media_path is not null)
    ),
  add constraint couple_messages_media_pair_check
    check (
      (media_path is null and media_type is null)
      or (
        media_path is not null
        and media_type in ('image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/aac')
      )
    );

create table if not exists public.couple_photos (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  caption text not null default '' check (char_length(caption) <= 120),
  created_at timestamptz not null default now()
);

create or replace function public.is_couple_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.couple_members
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_couple_member() from public, anon;
grant execute on function public.is_couple_member() to authenticated;

alter table public.couple_members enable row level security;
alter table public.couple_messages enable row level security;
alter table public.couple_photos enable row level security;

grant select on public.couple_members to authenticated;
grant select, insert on public.couple_messages to authenticated;
grant select, insert, delete on public.couple_photos to authenticated;

drop policy if exists "couple members can read their membership" on public.couple_members;
create policy "couple members can read their membership"
  on public.couple_members for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "couple members can read messages" on public.couple_messages;
create policy "couple members can read messages"
  on public.couple_messages for select to authenticated
  using (public.is_couple_member());

drop policy if exists "couple members can send messages as themselves" on public.couple_messages;
create policy "couple members can send messages as themselves"
  on public.couple_messages for insert to authenticated
  with check (
    public.is_couple_member()
    and sender_id = (select auth.uid())
    and (media_path is null or media_path like ((select auth.uid())::text || '/%'))
  );

drop policy if exists "couple members can read photos" on public.couple_photos;
create policy "couple members can read photos"
  on public.couple_photos for select to authenticated
  using (public.is_couple_member());

drop policy if exists "couple members can add photos as themselves" on public.couple_photos;
create policy "couple members can add photos as themselves"
  on public.couple_photos for insert to authenticated
  with check (public.is_couple_member() and sender_id = (select auth.uid()));

drop policy if exists "members can delete their own photo records" on public.couple_photos;
create policy "members can delete their own photo records"
  on public.couple_photos for delete to authenticated
  using (public.is_couple_member() and sender_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('couple-moments', 'couple-moments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'couple-chat',
  'couple-chat',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/aac']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "couple members can read shared photos" on storage.objects;
create policy "couple members can read shared photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'couple-moments' and public.is_couple_member());

drop policy if exists "couple members can upload into their folder" on storage.objects;
create policy "couple members can upload into their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'couple-moments'
    and public.is_couple_member()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "couple members can delete their own uploaded files" on storage.objects;
create policy "couple members can delete their own uploaded files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'couple-moments'
    and public.is_couple_member()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "couple members can read chat attachments" on storage.objects;
create policy "couple members can read chat attachments"
  on storage.objects for select to authenticated
  using (bucket_id = 'couple-chat' and public.is_couple_member());

drop policy if exists "couple members can upload their chat attachments" on storage.objects;
create policy "couple members can upload their chat attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'couple-chat'
    and public.is_couple_member()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "couple members can remove their chat uploads" on storage.objects;
create policy "couple members can remove their chat uploads"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'couple-chat'
    and public.is_couple_member()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_messages'
  ) then
    alter publication supabase_realtime add table public.couple_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_photos'
  ) then
    alter publication supabase_realtime add table public.couple_photos;
  end if;
end $$;

-- Shared features for the private couple area.
create table if not exists public.couple_timeline (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  details text not null default '' check (char_length(details) <= 800),
  happened_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_letters (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  content text not null check (char_length(content) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table if not exists public.couple_diary (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 100),
  content text not null check (char_length(content) between 1 and 2000),
  entry_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_plans (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  details text not null default '' check (char_length(details) <= 800),
  planned_for date,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_wishes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null default 'outro' check (category in ('passeio', 'comida', 'filme ou série', 'viagem', 'outro')),
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_notes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  content text not null default '' check (char_length(content) <= 500),
  created_at timestamptz not null default now()
);

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

create table if not exists public.couple_questions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 240),
  created_at timestamptz not null default now()
);

create table if not exists public.couple_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.couple_questions(id) on delete cascade,
  responder_id uuid not null references auth.users(id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 500),
  updated_at timestamptz not null default now(),
  unique (question_id, responder_id)
);

create table if not exists public.couple_events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  details text not null default '' check (char_length(details) <= 800),
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'couple_timeline', 'couple_letters', 'couple_diary', 'couple_plans',
    'couple_wishes', 'couple_notes', 'couple_songs', 'couple_questions', 'couple_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('drop policy if exists "couple feature members can read" on public.%I', table_name);
    execute format('create policy "couple feature members can read" on public.%I for select to authenticated using (public.is_couple_member())', table_name);
    execute format('drop policy if exists "couple feature members can add own" on public.%I', table_name);
    execute format('create policy "couple feature members can add own" on public.%I for insert to authenticated with check (public.is_couple_member() and created_by = (select auth.uid()))', table_name);
    execute format('drop policy if exists "couple feature members can update" on public.%I', table_name);
    execute format('create policy "couple feature members can update" on public.%I for update to authenticated using (public.is_couple_member()) with check (public.is_couple_member())', table_name);
    execute format('drop policy if exists "authors can remove their own feature entries" on public.%I', table_name);
    execute format('create policy "authors can remove their own feature entries" on public.%I for delete to authenticated using (public.is_couple_member() and created_by = (select auth.uid()))', table_name);
  end loop;
end $$;

alter table public.couple_answers enable row level security;
grant select, insert, update, delete on public.couple_answers to authenticated;
drop policy if exists "couple members can read answers" on public.couple_answers;
create policy "couple members can read answers" on public.couple_answers
  for select to authenticated using (public.is_couple_member());
drop policy if exists "members can answer as themselves" on public.couple_answers;
create policy "members can answer as themselves" on public.couple_answers
  for insert to authenticated with check (public.is_couple_member() and responder_id = (select auth.uid()));
drop policy if exists "members can update their own answers" on public.couple_answers;
create policy "members can update their own answers" on public.couple_answers
  for update to authenticated using (public.is_couple_member() and responder_id = (select auth.uid()))
  with check (public.is_couple_member() and responder_id = (select auth.uid()));
drop policy if exists "members can remove their own answers" on public.couple_answers;
create policy "members can remove their own answers" on public.couple_answers
  for delete to authenticated using (public.is_couple_member() and responder_id = (select auth.uid()));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'couple_timeline', 'couple_letters', 'couple_diary', 'couple_plans',
    'couple_wishes', 'couple_notes', 'couple_songs', 'couple_questions', 'couple_answers', 'couple_events'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
