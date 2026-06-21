import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@abodespot.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "AbodeSpotTest#2026";
const AGENT_EMAILS = ["agent@abodespot.test", "agent2@abodespot.test"];

function readDotEnv() {
  const envPath = new URL("../.env", import.meta.url);
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx), line.slice(idx + 1).replace(/^['"]|['"]$/g, "")];
      })
  );
}

const dotEnv = readDotEnv();
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? dotEnv.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? dotEnv.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

const listings = [
  ["Sapphire Family Villa", "house", "sale", 185000000, 5, 5, 5600, "Lekki Phase 1", "Lagos", "Admiralty Way", "1564013799919-ab600027ffc6"],
  ["Maple Duplex Residence", "house", "sale", 245000000, 5, 6, 6200, "Ikoyi", "Lagos", "Bourdillon Road", "1600596542815-ffad4c1539a9"],
  ["Cedar View Detached Home", "house", "sale", 92000000, 4, 4, 4100, "Gwarinpa", "Abuja", "3rd Avenue", "1568605114967-8130f3a36994"],
  ["Olive Grove Terrace House", "house", "rent", 9500000, 4, 4, 3600, "Asokoro", "Abuja", "Yakubu Gowon Crescent", "1600585154340-be6161a56a0c"],
  ["Palm Court Four Bedroom Home", "house", "sale", 78000000, 4, 4, 3400, "Ajah", "Lagos", "Sangotedo Road", "1512917774080-9991f1c4c750"],
  ["Orchid Crest Smart Home", "house", "rent", 12500000, 4, 5, 3900, "Port Harcourt", "Rivers", "Peter Odili Road", "1600047509807-ba8f99d2cdde"],
  ["Meadow Park Bungalow", "house", "sale", 46500000, 3, 3, 2500, "Ibadan", "Oyo", "Jericho GRA", "1560184897-ae75f418493e"],
  ["Lagoon Edge Townhouse", "house", "sale", 168000000, 4, 5, 4300, "Victoria Island", "Lagos", "Akin Adesola Street", "1600566753190-17f0baa2a6c3"],
  ["Brookstone Estate Home", "house", "rent", 5200000, 3, 3, 2800, "Enugu", "Enugu", "Independence Layout", "1600607687939-ce8a6c25118c"],
  ["Coral Bay Family House", "house", "sale", 58000000, 4, 4, 3100, "Uyo", "Akwa Ibom", "Shelter Afrique", "1600210492486-724fe5c67fb0"],
  ["Eko Atlantic Studio Loft", "apartment", "rent", 4500000, 1, 1, 720, "Eko Atlantic", "Lagos", "Marina District", "1522708323590-d24dbb6b0267"],
  ["Admiralty Two Bedroom Apartment", "apartment", "rent", 3800000, 2, 2, 1100, "Lekki Phase 1", "Lagos", "Admiralty Road", "1502672260266-1c1ef2d93688"],
  ["Wuse Executive Apartment", "apartment", "sale", 68000000, 3, 3, 1800, "Wuse 2", "Abuja", "Adetokunbo Ademola Crescent", "1554995207-c18c203602cb"],
  ["Maitama Serviced Apartment", "apartment", "rent", 11500000, 3, 4, 2100, "Maitama", "Abuja", "Aguiyi Ironsi Street", "1484154218962-a197022b5858"],
  ["Yaba Compact Apartment", "apartment", "rent", 1850000, 1, 1, 600, "Yaba", "Lagos", "Herbert Macaulay Way", "1493809842364-78817add7ffb"],
  ["Oniru Seaview Apartment", "apartment", "sale", 105000000, 3, 3, 2200, "Oniru", "Lagos", "Palace Road", "1598928506311-c55ded91a20c"],
  ["Jabi Lake Penthouse", "apartment", "sale", 152000000, 4, 5, 3200, "Jabi", "Abuja", "Lake View Drive", "1616047006789-b7af5afb8c20"],
  ["Ikeja GRA Apartment", "apartment", "rent", 4200000, 2, 2, 1200, "Ikeja GRA", "Lagos", "Isaac John Street", "1616486338812-3dadae4b4ace"],
  ["Old GRA Port Harcourt Flat", "apartment", "rent", 3600000, 3, 3, 1600, "Old GRA", "Rivers", "Tombia Street", "1505693416388-ac5ce068fe85"],
  ["Ring Road City Apartment", "apartment", "sale", 39500000, 2, 2, 1000, "Benin City", "Edo", "Airport Road", "1560448204-e02f11c3d0e2"],
  ["Epe Residential Plot", "land", "sale", 12500000, null, null, 6480, "Epe", "Lagos", "Epe Resort Road", "1500382017468-9049fed747ef"],
  ["Ibeju-Lekki Dry Land Parcel", "land", "sale", 18500000, null, null, 5400, "Ibeju-Lekki", "Lagos", "Free Trade Zone Axis", "1464822759023-fed622ff2c3b"],
  ["Lugbe Mixed-Use Land", "land", "sale", 22000000, null, null, 7200, "Lugbe", "Abuja", "Airport Road Corridor", "1500530855697-b586d89ba3ee"],
  ["Moniya Development Plot", "land", "sale", 8500000, null, null, 5000, "Ibadan", "Oyo", "Moniya Station Road", "1447752875215-b2761acb3c5d"],
  ["Apo Resettlement Plot", "land", "sale", 36000000, null, null, 9000, "Apo", "Abuja", "Resettlement Zone E", "1500534314209-a25ddb2bd429"],
  ["Eleko Beachfront Land", "land", "sale", 28000000, null, null, 10000, "Eleko", "Lagos", "Beach Road", "1500534623283-312aade485b7"],
  ["Mpape Hillside Plot", "land", "sale", 16500000, null, null, 6400, "Mpape", "Abuja", "Hillside Extension", "1506744038136-46273834b3fb"],
  ["Awka Commercial Land", "land", "sale", 24500000, null, null, 8200, "Awka", "Anambra", "Enugu-Onitsha Expressway", "1473773508845-188df298d2d1"],
  ["Osogbo Estate Plot", "land", "sale", 7200000, null, null, 4800, "Osogbo", "Osun", "Oke-Fia Axis", "1469474968028-56623f02e42e"],
  ["Abeokuta Gateway Land", "land", "sale", 9800000, null, null, 6000, "Abeokuta", "Ogun", "Kobape Road", "1470770841072-f978cf4d019e"],
  ["Victoria Island Retail Showroom", "commercial", "rent", 18000000, null, 3, 4500, "Victoria Island", "Lagos", "Ahmadu Bello Way", "1486406146926-c627a92ad1ab"],
  ["Lekki Phase 1 Office Suite", "commercial", "rent", 14500000, null, 4, 3800, "Lekki Phase 1", "Lagos", "Fola Osibo Street", "1497366216548-37526070297c"],
  ["Ikeja Warehouse Facility", "commercial", "rent", 22000000, null, 4, 12500, "Ikeja", "Lagos", "Oba Akran Avenue", "1497366754035-f200968a6e72"],
  ["Wuse 2 Corporate Office", "commercial", "sale", 320000000, null, 6, 9000, "Wuse 2", "Abuja", "Aminu Kano Crescent", "1497366811353-6870744d04b2"],
  ["Port Harcourt Shopfront", "commercial", "rent", 6500000, null, 2, 1800, "Port Harcourt", "Rivers", "Aba Road", "1497215842964-222b430dc094"],
  ["Surulere Mixed-Use Block", "commercial", "sale", 135000000, null, 5, 7200, "Surulere", "Lagos", "Bode Thomas Street", "1481277542470-605612bd2d61"],
  ["Garki Medical Office Space", "commercial", "rent", 9800000, null, 4, 2600, "Garki", "Abuja", "Area 11", "1518005020951-eccb494ad742"],
  ["Enugu Roadside Plaza", "commercial", "sale", 88000000, null, 4, 6400, "Enugu", "Enugu", "Ogui Road", "1464938050520-ef2270bb8ce8"],
  ["Kano Trade Centre Unit", "commercial", "rent", 7200000, null, 3, 3000, "Kano", "Kano", "Zoo Road", "1504384308090-c894fdcc538d"],
  ["Apapa Logistics Yard", "commercial", "sale", 410000000, null, 8, 24000, "Apapa", "Lagos", "Creek Road", "1494526585095-c41746248156"],
];

const descriptionByType = {
  house: "A move-in-ready residential home with practical rooms, natural light, secure parking, and easy access to daily amenities.",
  apartment: "A well-finished apartment suited for city living, with efficient space planning, modern fittings, and convenient transport access.",
  land: "A documented land opportunity in a growing corridor, suitable for residential or mixed development subject to local planning approval.",
  commercial: "A functional commercial property positioned for office, retail, logistics, or service-led businesses with strong access routes.",
};

async function requireOk(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

const { error: authError } = await supabase.auth.signInWithPassword({
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
});
if (authError) throw new Error(`Admin sign in failed: ${authError.message}`);

const agents = await requireOk(
  supabase
    .from("users")
    .select("id,email,full_name")
    .in("email", AGENT_EMAILS),
  "Load seed agents"
);

if (!agents || agents.length === 0) {
  throw new Error("No seed agents found. Run the smoke setup first or create approved agent accounts.");
}

const titles = listings.map(([title]) => title);
await requireOk(
  supabase.from("properties").delete().in("title", titles),
  "Clear existing seeded properties"
);

const now = Date.now();
const rows = listings.map((item, index) => {
  const [title, propertyType, listingType, price, bedrooms, bathrooms, areaSqft, city, state, address, imageId] = item;
  const agent = agents[index % agents.length];
  return {
    title,
    description: `${descriptionByType[propertyType]} ${city}, ${state} location with verified agent support through AbodeSpot.`,
    price,
    bedrooms,
    bathrooms,
    area_sqft: areaSqft,
    property_type: propertyType,
    listing_type: listingType,
    address,
    city,
    state,
    zip_code: null,
    images: [img(imageId)],
    agent_id: agent.id,
    status: "approved",
    featured: index % 7 === 0,
    views: 80 + index * 17,
    created_at: new Date(now - index * 86_400_000).toISOString(),
  };
});

const inserted = await requireOk(
  supabase.from("properties").insert(rows).select("id,title,property_type"),
  "Insert production seed properties"
);

const counts = inserted.reduce((acc, row) => {
  acc[row.property_type] = (acc[row.property_type] ?? 0) + 1;
  return acc;
}, {});

console.log(`Seeded ${inserted.length} approved properties`);
console.log(JSON.stringify(counts, null, 2));
