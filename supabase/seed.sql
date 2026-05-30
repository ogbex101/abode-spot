-- ============================================================
-- SEED DATA — Run this AFTER schema.sql to populate the DB
-- with sample Nigerian real estate listings.
-- ============================================================

-- First create two demo agent users in Supabase Auth dashboard,
-- then run this to insert their profiles and properties.
-- Replace the UUIDs below with the actual user IDs created in auth.

-- Demo Agent 1
DO $$
DECLARE
  agent1_id uuid := '00000000-0000-0000-0000-000000000001';
  agent2_id uuid := '00000000-0000-0000-0000-000000000002';
BEGIN
  -- Insert demo agent profiles (only if not already created by trigger)
  INSERT INTO public.users (id, email, full_name, role, is_verified, phone, company_name)
  VALUES
    (agent1_id, 'agent1@abodespot.com', 'Emeka Okafor', 'agent', true, '+234 803 456 7890', 'Okafor Realty Group'),
    (agent2_id, 'agent2@abodespot.com', 'Fatima Bello', 'agent', true, '+234 805 234 5678', 'Bello Properties Ltd')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_verified = EXCLUDED.is_verified,
    phone = EXCLUDED.phone,
    company_name = EXCLUDED.company_name;

  -- Assign agent roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (agent1_id, 'agent'), (agent2_id, 'agent')
  ON CONFLICT DO NOTHING;

  -- Insert properties
  INSERT INTO public.properties (title, description, price, bedrooms, bathrooms, area_sqft, property_type, listing_type, address, city, state, zip_code, images, agent_id, status, featured, views) VALUES

  -- Houses
  ('Luxury 5-Bedroom Detached Duplex, Lekki Phase 1',
   'Exquisite duplex on a serene street in Lekki Phase 1. Features marble flooring, a fitted kitchen, BQ quarters, swimming pool, and 24/7 security. Perfect for executives and families.',
   320000000, 5, 5, 4800, 'house', 'sale', '14 Admiralty Way', 'Lekki', 'Lagos', '106104',
   ARRAY['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200','https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200','https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200'],
   agent1_id, 'approved', true, 892),

  ('4-Bedroom Terrace, Gwarinpa Estate, Abuja',
   'Spacious 4-bedroom terrace with well-landscaped compound, modern kitchen, and covered parking in the serene Gwarinpa Estate.',
   85000000, 4, 3, 3200, 'house', 'sale', '5 3rd Avenue', 'Gwarinpa', 'Abuja', '900108',
   ARRAY['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200','https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200'],
   agent2_id, 'approved', true, 634),

  ('3-Bedroom Semi-Detached Bungalow, New GRA, Port Harcourt',
   'Well-finished semi-detached bungalow in the prestigious New GRA area. Features 3 ensuite bedrooms and a neat compound.',
   65000000, 3, 3, 2100, 'house', 'sale', '22 Stadium Road', 'Port Harcourt', 'Rivers', '500001',
   ARRAY['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200','https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200','https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200'],
   agent1_id, 'approved', false, 412),

  ('Furnished 5-Bedroom Smart Villa For Rent, Victoria Island',
   'Exquisitely furnished smart home on a quiet cul-de-sac in Victoria Island. Comes with top-of-the-range appliances and home cinema.',
   18000000, 5, 6, 5500, 'house', 'rent', '9 Kingsway Road', 'Victoria Island', 'Lagos', '101241',
   ARRAY['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200','https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200','https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200'],
   agent2_id, 'approved', true, 1023),

  -- Apartments
  ('2-Bedroom Luxury Apartment, Eko Atlantic City',
   'Stunning sea-view apartment in the brand new Eko Atlantic development. Floor-to-ceiling glass windows, fully fitted kitchen, gym, and concierge.',
   195000000, 2, 2, 1650, 'apartment', 'sale', 'Plot 15 Ocean Drive', 'Eko Atlantic', 'Lagos', '101223',
   ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200','https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200'],
   agent1_id, 'approved', true, 1487),

  ('Serviced 3-Bedroom Flat For Rent, Ikoyi',
   'High-floor serviced apartment in modern Ikoyi complex. 24/7 power, swimming pool, gym, security, and ample parking. Ideal for corporate tenants.',
   7500000, 3, 3, 2200, 'apartment', 'rent', '3 Bourdillon Road', 'Ikoyi', 'Lagos', '101223',
   ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200','https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200'],
   agent2_id, 'approved', false, 765),

  ('1-Bedroom Studio Apartment, Wuse 2, Abuja',
   'Cozy studio apartment in the heart of Wuse 2. Ideal for young professionals. Modern bathroom, 24hr security, reliable power supply.',
   2200000, 1, 1, 620, 'apartment', 'rent', 'Plot 22 IBB Way', 'Wuse 2', 'Abuja', '900104',
   ARRAY['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200'],
   agent1_id, 'approved', false, 298),

  ('4-Bedroom Penthouse, Banana Island',
   'Ultra-luxury penthouse spanning the entire top floor on Banana Island. Private rooftop terrace, private lift, and panoramic ocean views.',
   980000000, 4, 5, 6800, 'apartment', 'sale', 'Block D, Banana Island', 'Ikoyi', 'Lagos', '101223',
   ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200','https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200'],
   agent2_id, 'approved', true, 2341),

  -- Land
  ('600 sqm Dry Land, Sangotedo, Ajah',
   '600 square metres of dry, well-documented land in fast-developing Sangotedo. C of O available. Perfect for residential or investment development.',
   28000000, null, null, 6458, 'land', 'sale', 'Opposite Shoprite, Sangotedo', 'Ajah', 'Lagos', '106104',
   ARRAY['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200','https://images.unsplash.com/photo-1549517045-bc93de075e53?w=1200','https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200'],
   agent1_id, 'approved', false, 187),

  ('1,000 sqm Corner Piece, Maitama, Abuja',
   'Prime 1,000 sqm corner-piece land in the prestigious Maitama district. Survey Plan and Deed of Assignment available. Great for luxury home construction.',
   180000000, null, null, 10764, 'land', 'sale', 'Plot 45 Bangui Street', 'Maitama', 'Abuja', '900001',
   ARRAY['https://images.unsplash.com/photo-1549517045-bc93de075e53?w=1200','https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200','https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200'],
   agent2_id, 'approved', true, 543),

  ('2 Plots of Land, Epe Extension, Lagos',
   'Two plots (~1,200 sqm total) with Government Consent in an estate with good road access in Epe. Suitable for residential or mixed development.',
   12000000, null, null, 12917, 'land', 'sale', 'Araga Estate', 'Epe', 'Lagos', '106101',
   ARRAY['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200','https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200','https://images.unsplash.com/photo-1549517045-bc93de075e53?w=1200'],
   agent1_id, 'approved', false, 94),

  -- Commercial
  ('Open-Plan Office Floor, Marina, Lagos Island',
   'Full floor office space (2,500 sqft) in a Grade-A Marina building. Fully fitted with raised floors, central AC, high-speed fibre, and a dedicated boardroom.',
   22000000, null, 4, 2500, 'commercial', 'rent', '10 Commercial Road, Marina', 'Lagos Island', 'Lagos', '101003',
   ARRAY['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200','https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200','https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200'],
   agent2_id, 'approved', false, 326),

  ('Retail Showroom / Shop, Ikeja GRA',
   '1,800 sqft ground-floor retail space in a busy commercial building along Mobolaji Bank Anthony Way. High foot traffic, glass frontage.',
   9500000, null, 2, 1800, 'commercial', 'rent', 'Mobolaji Bank Anthony Way', 'Ikeja', 'Lagos', '100001',
   ARRAY['https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200','https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200','https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200'],
   agent1_id, 'approved', false, 210),

  ('Commercial Plaza For Sale, Wuse Market, Abuja',
   'Fully tenanted 3-storey commercial plaza in Wuse Market. 24 shops on ground floor, 12 offices on upper floors. Excellent ROI investment.',
   750000000, null, 6, 8500, 'commercial', 'sale', 'Zone 5 Wuse Market', 'Wuse', 'Abuja', '900003',
   ARRAY['https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200','https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200','https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200'],
   agent2_id, 'approved', true, 889);

END $$;
