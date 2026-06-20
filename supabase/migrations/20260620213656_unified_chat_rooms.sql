-- Unify buyer-agent and agent-agent messaging around conversations/messages.
-- Existing conversations are backfilled into ordered participants so the app no
-- longer needs separate "buyer" and "agent" reply paths.

alter table public.conversations
  add column if not exists conversation_type text,
  add column if not exists participant_a_id uuid references public.users(id) on delete cascade,
  add column if not exists participant_b_id uuid references public.users(id) on delete cascade,
  add column if not exists created_by uuid references public.users(id) on delete set null;

update public.conversations
set
  conversation_type = coalesce(conversation_type, 'property'),
  participant_a_id = coalesce(
    participant_a_id,
    case when user_id::text < agent_id::text then user_id else agent_id end
  ),
  participant_b_id = coalesce(
    participant_b_id,
    case when user_id::text < agent_id::text then agent_id else user_id end
  ),
  created_by = coalesce(created_by, user_id)
where
  conversation_type is null
  or participant_a_id is null
  or participant_b_id is null
  or created_by is null;

alter table public.conversations
  alter column conversation_type set default 'property',
  alter column conversation_type set not null,
  alter column participant_a_id set not null,
  alter column participant_b_id set not null,
  alter column property_id drop not null;

do $$
begin
  alter table public.conversations
    add constraint conversations_conversation_type_check
    check (conversation_type in ('property', 'direct'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.conversations
    add constraint conversations_ordered_participants_check
    check (participant_a_id < participant_b_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.conversations
    add constraint conversations_type_target_check
    check (
      (conversation_type = 'property' and property_id is not null)
      or
      (conversation_type = 'direct' and property_id is null)
    );
exception
  when duplicate_object then null;
end $$;

alter table public.conversations
  drop constraint if exists conversations_property_id_user_id_agent_id_key;

create index if not exists conversations_participant_a_id_idx
  on public.conversations(participant_a_id);

create index if not exists conversations_participant_b_id_idx
  on public.conversations(participant_b_id);

create index if not exists conversations_last_message_at_idx
  on public.conversations(last_message_at desc);

create unique index if not exists conversations_property_participants_key
  on public.conversations(property_id, participant_a_id, participant_b_id)
  where conversation_type = 'property';

create unique index if not exists conversations_direct_participants_key
  on public.conversations(participant_a_id, participant_b_id)
  where conversation_type = 'direct';

-- Repair old self-addressed message rows where the opposite participant is known,
-- then prevent clients from inserting that bug again.
update public.messages m
set receiver_id = case
  when m.sender_id = c.participant_a_id then c.participant_b_id
  when m.sender_id = c.participant_b_id then c.participant_a_id
  else m.receiver_id
end
from public.conversations c
where m.conversation_id = c.id
  and m.sender_id = m.receiver_id
  and m.sender_id in (c.participant_a_id, c.participant_b_id);

delete from public.messages
where sender_id = receiver_id;

do $$
begin
  alter table public.messages
    add constraint messages_sender_receiver_distinct_check
    check (sender_id <> receiver_id);
exception
  when duplicate_object then null;
end $$;

revoke update on public.conversations from authenticated;
grant select, insert, delete on public.conversations to authenticated;

revoke update on public.messages from authenticated;
grant update (is_read, read_at) on public.messages to authenticated;

drop policy if exists conversations_select_participants on public.conversations;
drop policy if exists conversations_insert_participants on public.conversations;
drop policy if exists conversations_update_participants on public.conversations;
drop policy if exists conversations_update_admin on public.conversations;
drop policy if exists conversations_delete_admin on public.conversations;

create policy conversations_select_participants on public.conversations
  for select to authenticated
  using (
    participant_a_id = (select auth.uid())
    or participant_b_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy conversations_insert_participants on public.conversations
  for insert to authenticated
  with check (
    participant_a_id < participant_b_id
    and (
      participant_a_id = (select auth.uid())
      or participant_b_id = (select auth.uid())
      or app_private.has_role((select auth.uid()), 'admin')
    )
    and (
      (
        conversation_type = 'property'
        and property_id is not null
        and exists (
          select 1
          from public.properties p
          where p.id = property_id
            and p.agent_id in (participant_a_id, participant_b_id)
        )
      )
      or
      (
        conversation_type = 'direct'
        and property_id is null
        and app_private.has_role(participant_a_id, 'agent')
        and app_private.has_role(participant_b_id, 'agent')
      )
    )
  );

create policy conversations_update_admin on public.conversations
  for update to authenticated
  using (app_private.has_role((select auth.uid()), 'admin'))
  with check (app_private.has_role((select auth.uid()), 'admin'));

create policy conversations_delete_admin on public.conversations
  for delete to authenticated
  using (app_private.has_role((select auth.uid()), 'admin'));

drop policy if exists messages_select_involved on public.messages;
drop policy if exists messages_insert_sender on public.messages;
drop policy if exists messages_update_receiver_or_admin on public.messages;
drop policy if exists messages_delete_admin on public.messages;

create policy messages_select_involved on public.messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (
          c.participant_a_id = (select auth.uid())
          or c.participant_b_id = (select auth.uid())
        )
    )
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy messages_insert_sender on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and sender_id <> receiver_id
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (
          (sender_id = c.participant_a_id and receiver_id = c.participant_b_id)
          or
          (sender_id = c.participant_b_id and receiver_id = c.participant_a_id)
        )
    )
  );

create policy messages_update_receiver_or_admin on public.messages
  for update to authenticated
  using (
    (
      receiver_id = (select auth.uid())
      and exists (
        select 1
        from public.conversations c
        where c.id = conversation_id
          and (c.participant_a_id = receiver_id or c.participant_b_id = receiver_id)
      )
    )
    or app_private.has_role((select auth.uid()), 'admin')
  )
  with check (
    (
      receiver_id = (select auth.uid())
      and sender_id <> receiver_id
      and exists (
        select 1
        from public.conversations c
        where c.id = conversation_id
          and (
            (sender_id = c.participant_a_id and receiver_id = c.participant_b_id)
            or
            (sender_id = c.participant_b_id and receiver_id = c.participant_a_id)
          )
      )
    )
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy messages_delete_admin on public.messages
  for delete to authenticated
  using (app_private.has_role((select auth.uid()), 'admin'));
