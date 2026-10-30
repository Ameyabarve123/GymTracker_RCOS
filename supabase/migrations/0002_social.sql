-- GymTracker social schema (friends + groups).
-- The tables exist so the data model is complete; the Phase 1 app UI does not
-- use them yet. Safe to run now.

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

alter table public.friendships enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- Either party in a friendship can see / act on it.
create policy "friendships_participant" on public.friendships
  for all using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Groups: members can read; owner manages.
create policy "groups_member_select" on public.groups
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.group_members m
      where m.group_id = id and m.user_id = auth.uid()
    )
  );
create policy "groups_owner_write" on public.groups
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "group_members_self_or_owner" on public.group_members
  for all using (
    auth.uid() = user_id
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  ) with check (
    auth.uid() = user_id
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );
