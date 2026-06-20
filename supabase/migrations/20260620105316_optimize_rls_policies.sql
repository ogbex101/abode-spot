-- Rewrite policies to avoid per-row auth.uid() calls and overlapping
-- permissive policies reported by Supabase Performance Advisor.

drop policy if exists users_select_all on public.users;
drop policy if exists users_insert_self on public.users;
drop policy if exists users_update_self_or_admin on public.users;
drop policy if exists users_delete_admin on public.users;

create policy users_select_all on public.users
  for select using (true);

create policy users_insert_self on public.users
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy users_update_self_or_admin on public.users
  for update to authenticated
  using (
    id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  )
  with check (
    id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy users_delete_admin on public.users
  for delete to authenticated
  using (app_private.has_role((select auth.uid()), 'admin'));

drop policy if exists user_roles_select_own_or_admin on public.user_roles;
drop policy if exists user_roles_insert_self_basic on public.user_roles;
drop policy if exists user_roles_admin_all on public.user_roles;
drop policy if exists user_roles_update_admin on public.user_roles;
drop policy if exists user_roles_delete_admin on public.user_roles;

create policy user_roles_select_own_or_admin on public.user_roles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy user_roles_insert_self_or_admin on public.user_roles
  for insert to authenticated
  with check (
    (
      user_id = (select auth.uid())
      and role in ('user', 'pending_agent')
    )
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy user_roles_update_admin on public.user_roles
  for update to authenticated
  using (app_private.has_role((select auth.uid()), 'admin'))
  with check (app_private.has_role((select auth.uid()), 'admin'));

create policy user_roles_delete_admin on public.user_roles
  for delete to authenticated
  using (app_private.has_role((select auth.uid()), 'admin'));

drop policy if exists properties_public_or_owner_or_admin_select on public.properties;
drop policy if exists properties_insert_agent_or_admin on public.properties;
drop policy if exists properties_update_owner_or_admin on public.properties;
drop policy if exists properties_delete_owner_or_admin on public.properties;

create policy properties_public_or_owner_or_admin_select on public.properties
  for select
  using (
    status = 'approved'
    or agent_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy properties_insert_agent_or_admin on public.properties
  for insert to authenticated
  with check (
    app_private.has_role((select auth.uid()), 'admin')
    or (
      agent_id = (select auth.uid())
      and app_private.has_role((select auth.uid()), 'agent')
    )
  );

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
    )
  );

create policy properties_delete_owner_or_admin on public.properties
  for delete to authenticated
  using (
    agent_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  );

drop policy if exists saved_properties_owner_all on public.saved_properties;

create policy saved_properties_owner_select on public.saved_properties
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy saved_properties_owner_insert on public.saved_properties
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy saved_properties_owner_update on public.saved_properties
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy saved_properties_owner_delete on public.saved_properties
  for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists inquiries_insert_involved on public.inquiries;
drop policy if exists inquiries_select_involved on public.inquiries;
drop policy if exists inquiries_update_involved on public.inquiries;
drop policy if exists inquiries_delete_involved_or_admin on public.inquiries;

create policy inquiries_insert_involved on public.inquiries
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.properties p
      where p.id = property_id
        and p.agent_id = agent_id
    )
    and (
      (is_reply = false and user_id = (select auth.uid()))
      or (
        is_reply = true
        and parent_inquiry_id is not null
        and (user_id = (select auth.uid()) or agent_id = (select auth.uid()))
      )
      or app_private.has_role((select auth.uid()), 'admin')
    )
  );

create policy inquiries_select_involved on public.inquiries
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or agent_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy inquiries_update_involved on public.inquiries
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or agent_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  )
  with check (
    user_id = (select auth.uid())
    or agent_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy inquiries_delete_involved_or_admin on public.inquiries
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or agent_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  );

drop policy if exists conversations_select_participants on public.conversations;
drop policy if exists conversations_insert_participants on public.conversations;
drop policy if exists conversations_update_participants on public.conversations;
drop policy if exists conversations_delete_admin on public.conversations;

create policy conversations_select_participants on public.conversations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or agent_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy conversations_insert_participants on public.conversations
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    or agent_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy conversations_update_participants on public.conversations
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or agent_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  )
  with check (
    user_id = (select auth.uid())
    or agent_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  );

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
    sender_id = (select auth.uid())
    or receiver_id = (select auth.uid())
    or exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.user_id = (select auth.uid()) or c.agent_id = (select auth.uid()))
    )
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy messages_insert_sender on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (
      exists (
        select 1
        from public.conversations c
        where c.id = conversation_id
          and (c.user_id = (select auth.uid()) or c.agent_id = (select auth.uid()))
      )
      or app_private.has_role((select auth.uid()), 'admin')
    )
  );

create policy messages_update_receiver_or_admin on public.messages
  for update to authenticated
  using (
    receiver_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  )
  with check (
    receiver_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy messages_delete_admin on public.messages
  for delete to authenticated
  using (app_private.has_role((select auth.uid()), 'admin'));

drop policy if exists agent_applications_select_own_or_admin on public.agent_applications;
drop policy if exists agent_applications_insert_self on public.agent_applications;
drop policy if exists agent_applications_update_admin on public.agent_applications;
drop policy if exists agent_applications_delete_admin on public.agent_applications;

create policy agent_applications_select_own_or_admin on public.agent_applications
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  );

create policy agent_applications_insert_self on public.agent_applications
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy agent_applications_update_admin on public.agent_applications
  for update to authenticated
  using (app_private.has_role((select auth.uid()), 'admin'))
  with check (app_private.has_role((select auth.uid()), 'admin'));

create policy agent_applications_delete_admin on public.agent_applications
  for delete to authenticated
  using (app_private.has_role((select auth.uid()), 'admin'));

drop policy if exists homepage_content_public_read on public.homepage_content;
drop policy if exists homepage_content_admin_all on public.homepage_content;
drop policy if exists homepage_content_insert_admin on public.homepage_content;
drop policy if exists homepage_content_update_admin on public.homepage_content;
drop policy if exists homepage_content_delete_admin on public.homepage_content;

create policy homepage_content_public_read on public.homepage_content
  for select using (true);

create policy homepage_content_insert_admin on public.homepage_content
  for insert to authenticated
  with check (app_private.has_role((select auth.uid()), 'admin'));

create policy homepage_content_update_admin on public.homepage_content
  for update to authenticated
  using (app_private.has_role((select auth.uid()), 'admin'))
  with check (app_private.has_role((select auth.uid()), 'admin'));

create policy homepage_content_delete_admin on public.homepage_content
  for delete to authenticated
  using (app_private.has_role((select auth.uid()), 'admin'));

drop policy if exists property_images_auth_insert on storage.objects;
drop policy if exists property_images_owner_update on storage.objects;
drop policy if exists property_images_owner_delete on storage.objects;

create policy property_images_auth_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-images');

create policy property_images_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'property-images' and owner = (select auth.uid()))
  with check (bucket_id = 'property-images' and owner = (select auth.uid()));

create policy property_images_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'property-images'
    and (
      owner = (select auth.uid())
      or app_private.has_role((select auth.uid()), 'admin')
    )
  );
