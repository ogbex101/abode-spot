-- Remove the property approval queue while preserving the legacy status column.
-- Existing queued/declined demo listings become live listings, and future
-- approved-agent writes can no longer create pending/rejected properties.

update public.properties
set status = 'approved'
where status in ('pending', 'rejected');

alter table public.properties
  alter column status set default 'approved';

drop policy if exists properties_insert_agent_or_admin on public.properties;
create policy properties_insert_agent_or_admin on public.properties
  for insert to authenticated
  with check (
    app_private.has_role((select auth.uid()), 'admin')
    or (
      agent_id = (select auth.uid())
      and app_private.has_role((select auth.uid()), 'agent')
      and status = 'approved'
    )
  );

drop policy if exists properties_update_owner_or_admin on public.properties;
create policy properties_update_owner_or_admin on public.properties
  for update to authenticated
  using (
    agent_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  )
  with check (
    app_private.has_role((select auth.uid()), 'admin')
    or (
      agent_id = (select auth.uid())
      and app_private.has_role((select auth.uid()), 'agent')
      and status in ('approved', 'sold')
    )
  );

drop policy if exists conversations_insert_participants on public.conversations;
create policy conversations_insert_participants on public.conversations
  for insert to authenticated
  with check (
    not app_private.has_role((select auth.uid()), 'pending_agent')
    and participant_a_id < participant_b_id
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
            and p.status = 'approved'
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

drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_sender on public.messages
  for insert to authenticated
  with check (
    not app_private.has_role((select auth.uid()), 'pending_agent')
    and sender_id = (select auth.uid())
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

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'users'
    ) then
      alter publication supabase_realtime add table public.users;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'user_roles'
    ) then
      alter publication supabase_realtime add table public.user_roles;
    end if;
  end if;
end $$;
