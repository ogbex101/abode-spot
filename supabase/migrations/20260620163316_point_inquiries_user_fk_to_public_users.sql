-- The app embeds buyer details from public.users in inquiry queries.
-- Keep the public profile row as the FK target so PostgREST can resolve
-- user:users!inquiries_user_id_fkey(...).
alter table public.inquiries
  drop constraint if exists inquiries_user_id_fkey;

alter table public.inquiries
  add constraint inquiries_user_id_fkey
  foreign key (user_id)
  references public.users(id)
  on delete cascade;
