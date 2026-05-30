-- ============================================================
-- Real Estate App — Full Schema
-- Run this ENTIRE file in Supabase SQL Editor once.
-- ============================================================

-- 1) Enums --------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin','agent','user');
exception when duplicate_object then null; end $$;

-- 2) users (profile) ---------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text default 'user' check (role in ('admin','agent','user')),
  is_verified boolean default false,
  full_name text,
  phone text,
  company_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- 3) user_roles (authoritative for authorization) ----------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.user_roles where user_id = auth.uid()
       order by case role when 'admin' then 1 when 'agent' then 2 else 3 end
       limit 1),
    'user'::public.app_role
  );
$$;

-- 4) properties --------------------------------------------
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric not null,
  bedrooms int,
  bathrooms numeric,
  area_sqft int,
  property_type text not null check (property_type in ('house','apartment','land','commercial')),
  listing_type text not null check (listing_type in ('sale','rent')),
  address text,
  city text,
  state text,
  zip_code text,
  images text[] default '{}',
  agent_id uuid references public.users(id) on delete set null,
  status text default 'pending' check (status in ('pending','approved','rejected','sold')),
  featured boolean default false,
  views int default 0,
  created_at timestamptz default now()
);

-- 5) saved_properties --------------------------------------
create table if not exists public.saved_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  saved_at timestamptz default now(),
  unique (user_id, property_id)
);

-- 6) inquiries ---------------------------------------------
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  status text default 'unread' check (status in ('unread','read','replied')),
  created_at timestamptz default now()
);

-- 7) GRANTs (Supabase Data API) ----------------------------
grant select, insert, update, delete on public.users to authenticated;
grant select on public.users to anon;
grant all on public.users to service_role;

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

grant select on public.properties to anon, authenticated;
grant insert, update, delete on public.properties to authenticated;
grant all on public.properties to service_role;

grant select, insert, delete on public.saved_properties to authenticated;
grant all on public.saved_properties to service_role;

grant select, insert, update, delete on public.inquiries to authenticated;
grant all on public.inquiries to service_role;

-- 8) RLS ----------------------------------------------------
alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.properties enable row level security;
alter table public.saved_properties enable row level security;
alter table public.inquiries enable row level security;

-- users: anyone can read public profile fields; users update own; admins update all
drop policy if exists "users_select_all" on public.users;
create policy "users_select_all" on public.users for select using (true);
drop policy if exists "users_update_self" on public.users;
create policy "users_update_self" on public.users for update
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "users_admin_all" on public.users;
create policy "users_admin_all" on public.users for all
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "users_insert_self" on public.users;
create policy "users_insert_self" on public.users for insert
  with check (id = auth.uid());

-- user_roles: read own, admin manage all
drop policy if exists "ur_read_own" on public.user_roles;
create policy "ur_read_own" on public.user_roles for select
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists "ur_admin_all" on public.user_roles;
create policy "ur_admin_all" on public.user_roles for all
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- properties: public can see approved; agent sees own; admin sees all
drop policy if exists "props_public_approved" on public.properties;
create policy "props_public_approved" on public.properties for select
  using (status = 'approved' or agent_id = auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists "props_insert_agent" on public.properties;
create policy "props_insert_agent" on public.properties for insert
  with check (agent_id = auth.uid());
drop policy if exists "props_update_owner_or_admin" on public.properties;
create policy "props_update_owner_or_admin" on public.properties for update
  using (agent_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (agent_id = auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists "props_delete_owner_or_admin" on public.properties;
create policy "props_delete_owner_or_admin" on public.properties for delete
  using (agent_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- saved_properties: only owner
drop policy if exists "sp_owner_all" on public.saved_properties;
create policy "sp_owner_all" on public.saved_properties for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- inquiries: sender can read own; property owner (agent) can read; admin all
drop policy if exists "inq_insert_self" on public.inquiries;
create policy "inq_insert_self" on public.inquiries for insert
  with check (user_id = auth.uid());
drop policy if exists "inq_select_involved" on public.inquiries;
create policy "inq_select_involved" on public.inquiries for select
  using (
    user_id = auth.uid()
    or public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.properties p where p.id = inquiries.property_id and p.agent_id = auth.uid())
  );
drop policy if exists "inq_update_admin_or_agent" on public.inquiries;
create policy "inq_update_admin_or_agent" on public.inquiries for update
  using (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.properties p where p.id = inquiries.property_id and p.agent_id = auth.uid())
  );
drop policy if exists "inq_delete_admin" on public.inquiries;
create policy "inq_delete_admin" on public.inquiries for delete
  using (public.has_role(auth.uid(),'admin'));

-- 9) Auto-create profile row on signup ---------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, is_verified)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;
  -- default app role
  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 10) Storage bucket for property images -------------------
insert into storage.buckets (id, name, public)
values ('property-images','property-images', true)
on conflict (id) do nothing;

drop policy if exists "property_images_public_read" on storage.objects;
create policy "property_images_public_read" on storage.objects for select
  using (bucket_id = 'property-images');

drop policy if exists "property_images_auth_write" on storage.objects;
create policy "property_images_auth_write" on storage.objects for insert
  with check (bucket_id = 'property-images' and auth.role() = 'authenticated');

drop policy if exists "property_images_owner_modify" on storage.objects;
create policy "property_images_owner_modify" on storage.objects for update
  using (bucket_id = 'property-images' and owner = auth.uid());

drop policy if exists "property_images_owner_delete" on storage.objects;
create policy "property_images_owner_delete" on storage.objects for delete
  using (bucket_id = 'property-images' and (owner = auth.uid() or public.has_role(auth.uid(),'admin')));

-- ============================================================
-- ADMIN SETUP (run AFTER creating the admin user in Dashboard)
-- 1) Authentication > Users > Add user
--    Email: ogbeifundaniel0@gmail.com
--    Password: <your password>
--    [x] Auto Confirm User
-- 2) Then run:
--
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'ogbeifundaniel0@gmail.com'
-- on conflict do nothing;
--
-- update public.users set role='admin', is_verified=true
-- where email = 'ogbeifundaniel0@gmail.com';
-- ============================================================
