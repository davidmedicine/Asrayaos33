-- 20240422103012_channels.sql
-- Workspace channels, memberships, messages and quests
-------------------------------------------------------

-- 1. workspaces (simplified) – if you don’t have it yet
create table if not exists workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now()
);

-- 2. channels
create type channel_type as enum ('community', 'private');

create table channels (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name         text not null unique,
  type         channel_type not null default 'community',
  member_count integer not null default 0,
  created_at   timestamptz default now()
);

-- 3. channel_memberships
create table channel_memberships (
  channel_id   uuid references channels(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  joined_at    timestamptz default now(),
  primary key (channel_id, user_id)
);

-- 4. function: join_channel()
create or replace function public.join_channel(_channel uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into channel_memberships (channel_id, user_id)
  values (_channel, auth.uid())
  on conflict do nothing;

  update channels
  set    member_count = member_count + 1
  where  id = _channel;

  -- Broadcast the “joined” event so clients in topic channel:{id} can update live
  perform realtime.broadcast(
      format('channel:%s', _channel),  -- topic
      'membership',                    -- event
      json_build_object('user_id', auth.uid(), 'action', 'joined')
  );
end;
$$;

-- 5. RPC: fetch_workspace_channels()
create or replace function public.fetch_workspace_channels(_ws uuid)
returns table (
  id           uuid,
  name         text,
  type         channel_type,
  member_count integer,
  is_member    boolean
)
language sql
security definer
as $$
  select
    c.id, c.name, c.type, c.member_count,
    cm.channel_id is not null as is_member
  from channels c
  left join channel_memberships cm
    on cm.channel_id = c.id and cm.user_id = auth.uid()
  where c.workspace_id = _ws
  order by c.name;
$$;

-- 6. RLS
alter table channels          enable row level security;
alter table channel_memberships enable row level security;

-- Workspace members can read channels
create policy "workspace members read channels"
on channels
for select using (
  (select true from workspace_members wm where wm.workspace_id = channels.workspace_id and wm.user_id = auth.uid())
);

-- Only members of a channel can select memberships
create policy "channel members read memberships"
on channel_memberships
for select using ( user_id = auth.uid() );

-- Anyone who can see the channel can call join_channel()
grant execute on function join_channel(uuid) to authenticated;

-- Allow calling RPC
grant execute on function fetch_workspace_channels(uuid) to authenticated;
