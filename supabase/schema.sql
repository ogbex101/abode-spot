-- ============================================================
-- IMPORTANT: Disable email confirmation in Supabase Dashboard
-- Authentication > Settings > Email Auth
-- Turn OFF "Enable email confirmations"
-- This removes the email verification gate entirely.
-- ============================================================

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

grant select, insert on public.user_roles to authenticated;
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

-- user_roles: read own, admin manage all, users can insert their own role
drop policy if exists "ur_read_own" on public.user_roles;
create policy "ur_read_own" on public.user_roles for select
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists "ur_insert_self" on public.user_roles;
create policy "ur_insert_self" on public.user_roles for insert
  with check (user_id = auth.uid());
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

-- ============================================================
-- Homepage Content Management
-- ============================================================
create table if not exists public.homepage_content (
  id uuid primary key default gen_random_uuid(),
  section_key text unique not null,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Only admins can write; everyone can read
alter table public.homepage_content enable row level security;
drop policy if exists "hc_public_read" on public.homepage_content;
create policy "hc_public_read" on public.homepage_content for select using (true);
drop policy if exists "hc_admin_all" on public.homepage_content;
create policy "hc_admin_all" on public.homepage_content for all
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- Seed default homepage content
insert into public.homepage_content (section_key, data) values
('hero', '{
  "badge": "500+ verified listings this month",
  "heading_line1": "Find where",
  "heading_accent": "life happens.",
  "subtext": "Curated homes, transparent prices, and verified agents — all in one trusted platform.",
  "background_image": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=90",
  "stat_properties": "500+",
  "stat_clients": "100+",
  "stat_agents": "50+"
}'),
('browse_categories', '{
  "heading": "Browse by property type",
  "subtext": "From cosy apartments to sprawling estates — find exactly what you'\''re looking for.",
  "categories": [
    {"type": "house", "label": "Houses", "icon": "🏠", "desc": "Family homes & villas", "img": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80", "count": "220+"},
    {"type": "apartment", "label": "Apartments", "icon": "🏢", "desc": "Modern urban living", "img": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80", "count": "180+"},
    {"type": "land", "label": "Land", "icon": "🌿", "desc": "Build your dream", "img": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80", "count": "60+"},
    {"type": "commercial", "label": "Commercial", "icon": "🏪", "desc": "Offices & retail spaces", "img": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80", "count": "40+"}
  ]
}'),
('how_it_works', '{
  "heading": "How AbodeSpot works",
  "subtext": "Finding your perfect property takes just three easy steps.",
  "steps": [
    {"step": "01", "title": "Search & Filter", "desc": "Use our powerful search to find properties by location, type, price, and more."},
    {"step": "02", "title": "Visit & Compare", "desc": "Schedule viewings, compare listings side by side, and save your favourites."},
    {"step": "03", "title": "Connect & Close", "desc": "Contact verified agents directly and make your move with confidence."}
  ]
}'),
('why_us', '{
  "heading": "The AbodeSpot advantage",
  "features": [
    {"title": "Instant Alerts", "desc": "Get notified the moment a matching property is listed."},
    {"title": "Verified Agents", "desc": "Every agent is identity-checked and professionally rated."},
    {"title": "Wide Coverage", "desc": "Listings across major cities and emerging neighbourhoods."},
    {"title": "Zero Hidden Fees", "desc": "Transparent pricing — what you see is what you pay."}
  ]
}'),
('testimonials', '{
  "heading": "What our users say",
  "items": [
    {"name": "Adaeze Okonkwo", "role": "First-time Buyer", "rating": 5, "text": "AbodeSpot made finding my first home completely stress-free. The verified listings saved me so much time."},
    {"name": "Chukwuemeka Eze", "role": "Real Estate Investor", "rating": 5, "text": "I'\''ve used several platforms and AbodeSpot stands out. The agent quality is top-notch."},
    {"name": "Funmilayo Adeyemi", "role": "Tenant", "rating": 5, "text": "Found my dream apartment in Lekki within a week! The search filters are precise and the contact process was smooth."}
  ]
}'),
('cities', '{
  "heading": "Explore top cities",
  "locations": [
    {"city": "Lagos", "state": "Lagos", "count": "180+", "img": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80"},
    {"city": "Abuja", "state": "FCT", "count": "95+", "img": "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=80"},
    {"city": "Port Harcourt", "state": "Rivers", "count": "60+", "img": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80"},
    {"city": "Ibadan", "state": "Oyo", "count": "40+", "img": "https://images.unsplash.com/photo-1591474200742-8e512e6f98f8?w=600&q=80"}
  ]
}'),
('agent_cta', '{
  "heading": "List your property today.",
  "subtext": "Reach thousands of buyers and renters. Quick setup, no commission until you close.",
  "contact_heading": "Need help finding a home?",
  "contact_subtext": "Our team of property experts is ready to guide you. Reach out anytime.",
  "phone": "+234 800 ABODE SPOT",
  "email": "hello@abodespot.com",
  "hours": "Mon–Fri, 9am–6pm WAT"
}')
on conflict (section_key) do nothing;

-- ============================================================
-- AUTO-SEED: Demo properties (safe to run multiple times)
-- These use placeholder agent UUIDs. After creating real agent
-- users in Supabase, run supabase/seed.sql with their actual IDs.
-- ============================================================

-- Insert homepage_content defaults if not already seeded
insert into public.homepage_content (section_key, data) values
('hero', '{"badge":"500+ verified listings this month","heading_line1":"Find where","heading_accent":"life happens.","subtext":"Curated homes, transparent prices, and verified agents — all in one trusted platform.","background_image":"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=90","stat_properties":"500+","stat_clients":"100+","stat_agents":"50+"}'::jsonb),
('browse_categories', '{"heading":"Browse by property type","subtext":"From cosy apartments to sprawling estates — find exactly what you are looking for.","categories":[{"type":"house","label":"Houses","icon":"🏠","desc":"Family homes & villas","img":"https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80","count":"220+"},{"type":"apartment","label":"Apartments","icon":"🏢","desc":"Modern urban living","img":"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80","count":"180+"},{"type":"land","label":"Land","icon":"🌿","desc":"Build your dream","img":"https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80","count":"60+"},{"type":"commercial","label":"Commercial","icon":"🏪","desc":"Offices & retail spaces","img":"https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80","count":"40+"}]}'::jsonb),
('how_it_works', '{"heading":"How AbodeSpot works","subtext":"Finding your perfect property takes just three easy steps.","steps":[{"step":"01","title":"Search & Filter","desc":"Use our powerful search to find properties by location, type, price, and more."},{"step":"02","title":"Visit & Compare","desc":"Schedule viewings, compare listings side by side, and save your favourites."},{"step":"03","title":"Connect & Close","desc":"Contact verified agents directly and make your move with confidence."}]}'::jsonb),
('why_us', '{"heading":"The AbodeSpot advantage","features":[{"title":"Instant Alerts","desc":"Get notified the moment a matching property is listed."},{"title":"Verified Agents","desc":"Every agent is identity-checked and professionally rated."},{"title":"Wide Coverage","desc":"Listings across major cities and emerging neighbourhoods."},{"title":"Zero Hidden Fees","desc":"Transparent pricing — what you see is what you pay."}]}'::jsonb),
('testimonials', '{"heading":"What our users say","items":[{"name":"Adaeze Okonkwo","role":"First-time Buyer","rating":5,"text":"AbodeSpot made finding my first home completely stress-free. The verified listings saved me so much time."},{"name":"Chukwuemeka Eze","role":"Real Estate Investor","rating":5,"text":"I have used several platforms and AbodeSpot stands out. The agent quality is top-notch."},{"name":"Funmilayo Adeyemi","role":"Tenant","rating":5,"text":"Found my dream apartment in Lekki within a week! The search filters are precise and the contact process was smooth."}]}'::jsonb),
('cities', '{"heading":"Explore top cities","locations":[{"city":"Lagos","state":"Lagos","count":"180+","img":"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80"},{"city":"Abuja","state":"FCT","count":"95+","img":"https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=80"},{"city":"Port Harcourt","state":"Rivers","count":"60+","img":"https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80"},{"city":"Ibadan","state":"Oyo","count":"40+","img":"https://images.unsplash.com/photo-1591474200742-8e512e6f98f8?w=600&q=80"}]}'::jsonb),
('agent_cta', '{"heading":"List your property today.","subtext":"Reach thousands of buyers and renters. Quick setup, no commission until you close.","contact_heading":"Need help finding a home?","contact_subtext":"Our team of property experts is ready to guide you. Reach out anytime.","phone":"+234 800 ABODE SPOT","email":"hello@abodespot.com","hours":"Mon–Fri, 9am–6pm WAT"}'::jsonb)
on conflict (section_key) do nothing;
