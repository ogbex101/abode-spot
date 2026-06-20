-- AbodeSpot initial Supabase schema.
-- This migration is built from the app's actual table/column usage.

create extension if not exists pgcrypto with schema extensions;

do $$
begin
  create type public.app_role as enum ('admin', 'agent', 'user', 'pending_agent');
exception
  when duplicate_object then null;
end $$;

grant usage on type public.app_role to anon, authenticated, service_role;

create schema if not exists app_private;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text not null default 'user'
    check (role in ('admin', 'agent', 'user', 'pending_agent')),
  agent_status text not null default 'not_applied'
    check (agent_status in ('not_applied', 'pending', 'approved', 'rejected')),
  is_verified boolean not null default false,
  full_name text,
  phone text,
  company_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric not null,
  bedrooms int,
  bathrooms numeric,
  area_sqft int,
  property_type text not null check (property_type in ('house', 'apartment', 'land', 'commercial')),
  listing_type text not null check (listing_type in ('sale', 'rent')),
  address text,
  city text,
  state text,
  zip_code text,
  images text[] not null default '{}',
  agent_id uuid references public.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'sold')),
  featured boolean not null default false,
  views int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.users(id) on delete set null,
  receiver_id uuid references public.users(id) on delete set null,
  parent_inquiry_id uuid references public.inquiries(id) on delete cascade,
  is_reply boolean not null default false,
  message text not null,
  status text not null default 'unread' check (status in ('unread', 'read', 'replied')),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  agent_id uuid not null references public.users(id) on delete cascade,
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, user_id, agent_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  company_name text,
  license_number text,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_content (
  id uuid primary key default gen_random_uuid(),
  section_key text unique not null,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists properties_agent_id_idx on public.properties(agent_id);
create index if not exists properties_status_idx on public.properties(status);
create index if not exists saved_properties_user_id_idx on public.saved_properties(user_id);
create index if not exists inquiries_user_id_idx on public.inquiries(user_id);
create index if not exists inquiries_agent_id_idx on public.inquiries(agent_id);
create index if not exists inquiries_parent_inquiry_id_idx on public.inquiries(parent_inquiry_id);
create index if not exists conversations_user_id_idx on public.conversations(user_id);
create index if not exists conversations_agent_id_idx on public.conversations(agent_id);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_receiver_id_idx on public.messages(receiver_id);
create index if not exists agent_applications_user_id_idx on public.agent_applications(user_id);
create index if not exists agent_applications_status_idx on public.agent_applications(status);

create or replace function app_private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.handle_new_user()
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
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;

create or replace function app_private.update_conversation_from_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    last_message = new.message,
    last_message_at = new.created_at,
    updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

grant usage on schema app_private to anon, authenticated, service_role;
grant execute on function app_private.has_role(uuid, public.app_role) to anon, authenticated, service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function app_private.set_updated_at();

drop trigger if exists set_agent_applications_updated_at on public.agent_applications;
create trigger set_agent_applications_updated_at
  before update on public.agent_applications
  for each row execute function app_private.set_updated_at();

drop trigger if exists update_conversation_after_message on public.messages;
create trigger update_conversation_after_message
  after insert on public.messages
  for each row execute function app_private.update_conversation_from_message();

grant select on public.users to anon, authenticated;
grant insert, update, delete on public.users to authenticated;
grant all on public.users to service_role;

grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

grant select on public.properties to anon, authenticated;
grant insert, update, delete on public.properties to authenticated;
grant all on public.properties to service_role;

grant select, insert, update, delete on public.saved_properties to authenticated;
grant all on public.saved_properties to service_role;

grant select, insert, update, delete on public.inquiries to authenticated;
grant all on public.inquiries to service_role;

grant select, insert, update, delete on public.conversations to authenticated;
grant all on public.conversations to service_role;

grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;

grant select, insert, update, delete on public.agent_applications to authenticated;
grant all on public.agent_applications to service_role;

grant select on public.homepage_content to anon, authenticated;
grant insert, update, delete on public.homepage_content to authenticated;
grant all on public.homepage_content to service_role;

alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.properties enable row level security;
alter table public.saved_properties enable row level security;
alter table public.inquiries enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.agent_applications enable row level security;
alter table public.homepage_content enable row level security;

drop policy if exists users_select_all on public.users;
create policy users_select_all on public.users
  for select using (true);

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists users_update_self_or_admin on public.users;
create policy users_update_self_or_admin on public.users
  for update to authenticated
  using (id = auth.uid() or app_private.has_role(auth.uid(), 'admin'))
  with check (id = auth.uid() or app_private.has_role(auth.uid(), 'admin'));

drop policy if exists users_delete_admin on public.users;
create policy users_delete_admin on public.users
  for delete to authenticated
  using (app_private.has_role(auth.uid(), 'admin'));

drop policy if exists user_roles_select_own_or_admin on public.user_roles;
create policy user_roles_select_own_or_admin on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or app_private.has_role(auth.uid(), 'admin'));

drop policy if exists user_roles_insert_self_basic on public.user_roles;
create policy user_roles_insert_self_basic on public.user_roles
  for insert to authenticated
  with check (user_id = auth.uid() and role in ('user', 'pending_agent'));

drop policy if exists user_roles_admin_all on public.user_roles;
create policy user_roles_admin_all on public.user_roles
  for all to authenticated
  using (app_private.has_role(auth.uid(), 'admin'))
  with check (app_private.has_role(auth.uid(), 'admin'));

drop policy if exists properties_public_or_owner_or_admin_select on public.properties;
create policy properties_public_or_owner_or_admin_select on public.properties
  for select
  using (
    status = 'approved'
    or agent_id = auth.uid()
    or app_private.has_role(auth.uid(), 'admin')
  );

drop policy if exists properties_insert_agent_or_admin on public.properties;
create policy properties_insert_agent_or_admin on public.properties
  for insert to authenticated
  with check (
    app_private.has_role(auth.uid(), 'admin')
    or (
      agent_id = auth.uid()
      and app_private.has_role(auth.uid(), 'agent')
    )
  );

drop policy if exists properties_update_owner_or_admin on public.properties;
create policy properties_update_owner_or_admin on public.properties
  for update to authenticated
  using (agent_id = auth.uid() or app_private.has_role(auth.uid(), 'admin'))
  with check (
    app_private.has_role(auth.uid(), 'admin')
    or (
      agent_id = auth.uid()
      and app_private.has_role(auth.uid(), 'agent')
    )
  );

drop policy if exists properties_delete_owner_or_admin on public.properties;
create policy properties_delete_owner_or_admin on public.properties
  for delete to authenticated
  using (agent_id = auth.uid() or app_private.has_role(auth.uid(), 'admin'));

drop policy if exists saved_properties_owner_all on public.saved_properties;
create policy saved_properties_owner_all on public.saved_properties
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists inquiries_insert_involved on public.inquiries;
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
      (is_reply = false and user_id = auth.uid())
      or
      (is_reply = true and parent_inquiry_id is not null and (user_id = auth.uid() or agent_id = auth.uid()))
      or
      app_private.has_role(auth.uid(), 'admin')
    )
  );

drop policy if exists inquiries_select_involved on public.inquiries;
create policy inquiries_select_involved on public.inquiries
  for select to authenticated
  using (
    user_id = auth.uid()
    or agent_id = auth.uid()
    or app_private.has_role(auth.uid(), 'admin')
  );

drop policy if exists inquiries_update_involved on public.inquiries;
create policy inquiries_update_involved on public.inquiries
  for update to authenticated
  using (
    user_id = auth.uid()
    or agent_id = auth.uid()
    or app_private.has_role(auth.uid(), 'admin')
  )
  with check (
    user_id = auth.uid()
    or agent_id = auth.uid()
    or app_private.has_role(auth.uid(), 'admin')
  );

drop policy if exists inquiries_delete_involved_or_admin on public.inquiries;
create policy inquiries_delete_involved_or_admin on public.inquiries
  for delete to authenticated
  using (
    user_id = auth.uid()
    or agent_id = auth.uid()
    or app_private.has_role(auth.uid(), 'admin')
  );

drop policy if exists conversations_select_participants on public.conversations;
create policy conversations_select_participants on public.conversations
  for select to authenticated
  using (
    user_id = auth.uid()
    or agent_id = auth.uid()
    or app_private.has_role(auth.uid(), 'admin')
  );

drop policy if exists conversations_insert_participants on public.conversations;
create policy conversations_insert_participants on public.conversations
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or agent_id = auth.uid()
    or app_private.has_role(auth.uid(), 'admin')
  );

drop policy if exists conversations_update_participants on public.conversations;
create policy conversations_update_participants on public.conversations
  for update to authenticated
  using (
    user_id = auth.uid()
    or agent_id = auth.uid()
    or app_private.has_role(auth.uid(), 'admin')
  )
  with check (
    user_id = auth.uid()
    or agent_id = auth.uid()
    or app_private.has_role(auth.uid(), 'admin')
  );

drop policy if exists conversations_delete_admin on public.conversations;
create policy conversations_delete_admin on public.conversations
  for delete to authenticated
  using (app_private.has_role(auth.uid(), 'admin'));

drop policy if exists messages_select_involved on public.messages;
create policy messages_select_involved on public.messages
  for select to authenticated
  using (
    sender_id = auth.uid()
    or receiver_id = auth.uid()
    or exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.user_id = auth.uid() or c.agent_id = auth.uid())
    )
    or app_private.has_role(auth.uid(), 'admin')
  );

drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_sender on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      exists (
        select 1
        from public.conversations c
        where c.id = conversation_id
          and (c.user_id = auth.uid() or c.agent_id = auth.uid())
      )
      or app_private.has_role(auth.uid(), 'admin')
    )
  );

drop policy if exists messages_update_receiver_or_admin on public.messages;
create policy messages_update_receiver_or_admin on public.messages
  for update to authenticated
  using (receiver_id = auth.uid() or app_private.has_role(auth.uid(), 'admin'))
  with check (receiver_id = auth.uid() or app_private.has_role(auth.uid(), 'admin'));

drop policy if exists messages_delete_admin on public.messages;
create policy messages_delete_admin on public.messages
  for delete to authenticated
  using (app_private.has_role(auth.uid(), 'admin'));

drop policy if exists agent_applications_select_own_or_admin on public.agent_applications;
create policy agent_applications_select_own_or_admin on public.agent_applications
  for select to authenticated
  using (user_id = auth.uid() or app_private.has_role(auth.uid(), 'admin'));

drop policy if exists agent_applications_insert_self on public.agent_applications;
create policy agent_applications_insert_self on public.agent_applications
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists agent_applications_update_admin on public.agent_applications;
create policy agent_applications_update_admin on public.agent_applications
  for update to authenticated
  using (app_private.has_role(auth.uid(), 'admin'))
  with check (app_private.has_role(auth.uid(), 'admin'));

drop policy if exists agent_applications_delete_admin on public.agent_applications;
create policy agent_applications_delete_admin on public.agent_applications
  for delete to authenticated
  using (app_private.has_role(auth.uid(), 'admin'));

drop policy if exists homepage_content_public_read on public.homepage_content;
create policy homepage_content_public_read on public.homepage_content
  for select using (true);

drop policy if exists homepage_content_admin_all on public.homepage_content;
create policy homepage_content_admin_all on public.homepage_content
  for all to authenticated
  using (app_private.has_role(auth.uid(), 'admin'))
  with check (app_private.has_role(auth.uid(), 'admin'));

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

drop policy if exists property_images_public_read on storage.objects;
create policy property_images_public_read on storage.objects
  for select
  using (bucket_id = 'property-images');

drop policy if exists property_images_auth_insert on storage.objects;
create policy property_images_auth_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-images');

drop policy if exists property_images_owner_update on storage.objects;
create policy property_images_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'property-images' and owner = auth.uid())
  with check (bucket_id = 'property-images' and owner = auth.uid());

drop policy if exists property_images_owner_delete on storage.objects;
create policy property_images_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'property-images'
    and (owner = auth.uid() or app_private.has_role(auth.uid(), 'admin'))
  );

insert into public.homepage_content (section_key, data)
values
  ('hero', $${
    "badge": "500+ verified listings this month",
    "heading_line1": "Find where",
    "heading_accent": "life happens.",
    "subtext": "Curated homes, transparent prices, and verified agents - all in one trusted platform.",
    "background_image": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=90",
    "stat_properties": "500+",
    "stat_clients": "100+",
    "stat_agents": "50+"
  }$$::jsonb),
  ('browse_categories', $${
    "heading": "Browse by property type",
    "subtext": "From apartments to estates, find exactly what you are looking for.",
    "categories": [
      {"type": "house", "label": "Houses", "icon": "home", "desc": "Family homes and villas", "img": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80", "count": "220+"},
      {"type": "apartment", "label": "Apartments", "icon": "building", "desc": "Modern urban living", "img": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80", "count": "180+"},
      {"type": "land", "label": "Land", "icon": "tree", "desc": "Build your dream", "img": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80", "count": "60+"},
      {"type": "commercial", "label": "Commercial", "icon": "shop", "desc": "Offices and retail spaces", "img": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80", "count": "40+"}
    ]
  }$$::jsonb),
  ('how_it_works', $${
    "heading": "How AbodeSpot works",
    "subtext": "Finding your perfect property takes just three easy steps.",
    "steps": [
      {"step": "01", "title": "Search and Filter", "desc": "Use search to find properties by location, type, price, and more."},
      {"step": "02", "title": "Visit and Compare", "desc": "Schedule viewings, compare listings, and save favourites."},
      {"step": "03", "title": "Connect and Close", "desc": "Contact verified agents directly and make your move with confidence."}
    ]
  }$$::jsonb),
  ('why_us', $${
    "heading": "The AbodeSpot advantage",
    "features": [
      {"title": "Instant Alerts", "desc": "Get notified when a matching property is listed."},
      {"title": "Verified Agents", "desc": "Agents can be reviewed and approved by admins."},
      {"title": "Wide Coverage", "desc": "Listings across major cities and emerging neighbourhoods."},
      {"title": "Transparent Pricing", "desc": "Clear property pricing from the first view."}
    ]
  }$$::jsonb),
  ('testimonials', $${
    "heading": "What our users say",
    "items": [
      {"name": "Adaeze Okonkwo", "role": "First-time Buyer", "rating": 5, "text": "AbodeSpot made finding my first home easier."},
      {"name": "Chukwuemeka Eze", "role": "Real Estate Investor", "rating": 5, "text": "The agent workflow and listings are clear."},
      {"name": "Funmilayo Adeyemi", "role": "Tenant", "rating": 5, "text": "The search filters helped me compare options quickly."}
    ]
  }$$::jsonb),
  ('cities', $${
    "heading": "Explore top cities",
    "locations": [
      {"city": "Lagos", "state": "Lagos", "count": "180+", "img": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80"},
      {"city": "Abuja", "state": "FCT", "count": "95+", "img": "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=80"},
      {"city": "Port Harcourt", "state": "Rivers", "count": "60+", "img": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80"},
      {"city": "Ibadan", "state": "Oyo", "count": "40+", "img": "https://images.unsplash.com/photo-1591474200742-8e512e6f98f8?w=600&q=80"}
    ]
  }$$::jsonb),
  ('agent_cta', $${
    "heading": "List your property today.",
    "subtext": "Reach buyers and renters with a verified agent account.",
    "contact_heading": "Need help finding a home?",
    "contact_subtext": "Our team of property experts is ready to guide you.",
    "phone": "+234 800 ABODE SPOT",
    "email": "hello@abodespot.com",
    "hours": "Mon-Fri, 9am-6pm WAT"
  }$$::jsonb)
on conflict (section_key) do nothing;
