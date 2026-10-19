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
