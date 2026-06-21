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
  { legacyTitle: "Sapphire Family Villa", title: "Lekki Five-Bedroom Family Villa", propertyType: "house", listingType: "sale", price: 185000000, bedrooms: 5, bathrooms: 5, areaSqft: 5600, city: "Lekki Phase 1", state: "Lagos", address: "Lekki Phase 1, Lagos", imageIds: ["1605352081508-2e09927ecfe3", "1564013799919-ab600027ffc6", "1600585154340-be6161a56a0c"] },
  { legacyTitle: "Maple Duplex Residence", title: "Ikoyi Five-Bedroom Detached Duplex", propertyType: "house", listingType: "sale", price: 245000000, bedrooms: 5, bathrooms: 6, areaSqft: 6200, city: "Ikoyi", state: "Lagos", address: "Ikoyi, Lagos", imageIds: ["1531300365552-da5abe58a725", "1600596542815-ffad4c1539a9", "1600047509807-ba8f99d2cdde"] },
  { legacyTitle: "Cedar View Detached Home", title: "Gwarinpa Four-Bedroom Detached Home", propertyType: "house", listingType: "sale", price: 92000000, bedrooms: 4, bathrooms: 4, areaSqft: 4100, city: "Gwarinpa", state: "Abuja", address: "Gwarinpa, Abuja", imageIds: ["1568605114967-8130f3a36994", "1605352081428-500953badc02", "1560184897-ae75f418493e"] },
  { legacyTitle: "Olive Grove Terrace House", title: "Asokoro Four-Bedroom Terrace House", propertyType: "house", listingType: "rent", price: 9500000, bedrooms: 4, bathrooms: 4, areaSqft: 3600, city: "Asokoro", state: "Abuja", address: "Asokoro, Abuja", imageIds: ["1600585154340-be6161a56a0c", "1600607687939-ce8a6c25118c", "1605352081508-2e09927ecfe3"] },
  { legacyTitle: "Palm Court Four Bedroom Home", title: "Ajah Four-Bedroom Family Home", propertyType: "house", listingType: "sale", price: 78000000, bedrooms: 4, bathrooms: 4, areaSqft: 3400, city: "Ajah", state: "Lagos", address: "Ajah, Lagos", imageIds: ["1512917774080-9991f1c4c750", "1531300365552-da5abe58a725", "1600210492486-724fe5c67fb0"] },
  { legacyTitle: "Orchid Crest Smart Home", title: "Port Harcourt Four-Bedroom Family House", propertyType: "house", listingType: "rent", price: 12500000, bedrooms: 4, bathrooms: 5, areaSqft: 3900, city: "Port Harcourt", state: "Rivers", address: "Port Harcourt, Rivers", imageIds: ["1600047509807-ba8f99d2cdde", "1600585154340-be6161a56a0c", "1605352081508-2e09927ecfe3"] },
  { legacyTitle: "Meadow Park Bungalow", title: "Ibadan Three-Bedroom Bungalow", propertyType: "house", listingType: "sale", price: 46500000, bedrooms: 3, bathrooms: 3, areaSqft: 2500, city: "Ibadan", state: "Oyo", address: "Ibadan, Oyo", imageIds: ["1560184897-ae75f418493e", "1605352081428-500953badc02", "1568605114967-8130f3a36994"] },
  { legacyTitle: "Lagoon Edge Townhouse", title: "Victoria Island Four-Bedroom Townhouse", propertyType: "house", listingType: "sale", price: 168000000, bedrooms: 4, bathrooms: 5, areaSqft: 4300, city: "Victoria Island", state: "Lagos", address: "Victoria Island, Lagos", imageIds: ["1600566753190-17f0baa2a6c3", "1531300365552-da5abe58a725", "1600596542815-ffad4c1539a9"] },
  { legacyTitle: "Brookstone Estate Home", title: "Enugu Three-Bedroom Family Home", propertyType: "house", listingType: "rent", price: 5200000, bedrooms: 3, bathrooms: 3, areaSqft: 2800, city: "Enugu", state: "Enugu", address: "Enugu, Enugu", imageIds: ["1600607687939-ce8a6c25118c", "1600210492486-724fe5c67fb0", "1564013799919-ab600027ffc6"] },
  { legacyTitle: "Coral Bay Family House", title: "Uyo Four-Bedroom Family House", propertyType: "house", listingType: "sale", price: 58000000, bedrooms: 4, bathrooms: 4, areaSqft: 3100, city: "Uyo", state: "Akwa Ibom", address: "Uyo, Akwa Ibom", imageIds: ["1600210492486-724fe5c67fb0", "1600585154340-be6161a56a0c", "1605352081508-2e09927ecfe3"] },
  { legacyTitle: "Eko Atlantic Studio Loft", title: "Eko Atlantic Studio Apartment", propertyType: "apartment", listingType: "rent", price: 4500000, bedrooms: 1, bathrooms: 1, areaSqft: 720, city: "Eko Atlantic", state: "Lagos", address: "Eko Atlantic, Lagos", imageIds: ["1626882920560-80b382db2bc9", "1522708323590-d24dbb6b0267", "1502672260266-1c1ef2d93688"] },
  { legacyTitle: "Admiralty Two Bedroom Apartment", title: "Lekki Phase 1 Two-Bedroom Apartment", propertyType: "apartment", listingType: "rent", price: 3800000, bedrooms: 2, bathrooms: 2, areaSqft: 1100, city: "Lekki Phase 1", state: "Lagos", address: "Lekki Phase 1, Lagos", imageIds: ["1652081577415-bfc04074328c", "1502672260266-1c1ef2d93688", "1554995207-c18c203602cb"] },
  { legacyTitle: "Wuse Executive Apartment", title: "Wuse 2 Three-Bedroom Apartment", propertyType: "apartment", listingType: "sale", price: 68000000, bedrooms: 3, bathrooms: 3, areaSqft: 1800, city: "Wuse 2", state: "Abuja", address: "Wuse 2, Abuja", imageIds: ["1554995207-c18c203602cb", "1484154218962-a197022b5858", "1522708323590-d24dbb6b0267"] },
  { legacyTitle: "Maitama Serviced Apartment", title: "Maitama Serviced Three-Bedroom Apartment", propertyType: "apartment", listingType: "rent", price: 11500000, bedrooms: 3, bathrooms: 4, areaSqft: 2100, city: "Maitama", state: "Abuja", address: "Maitama, Abuja", imageIds: ["1484154218962-a197022b5858", "1616047006789-b7af5afb8c20", "1502672260266-1c1ef2d93688"] },
  { legacyTitle: "Yaba Compact Apartment", title: "Yaba One-Bedroom Apartment", propertyType: "apartment", listingType: "rent", price: 1850000, bedrooms: 1, bathrooms: 1, areaSqft: 600, city: "Yaba", state: "Lagos", address: "Yaba, Lagos", imageIds: ["1493809842364-78817add7ffb", "1522708323590-d24dbb6b0267", "1505693416388-ac5ce068fe85"] },
  { legacyTitle: "Oniru Seaview Apartment", title: "Oniru Three-Bedroom Apartment", propertyType: "apartment", listingType: "sale", price: 105000000, bedrooms: 3, bathrooms: 3, areaSqft: 2200, city: "Oniru", state: "Lagos", address: "Oniru, Lagos", imageIds: ["1598928506311-c55ded91a20c", "1626882920560-80b382db2bc9", "1616486338812-3dadae4b4ace"] },
  { legacyTitle: "Jabi Lake Penthouse", title: "Jabi Four-Bedroom Penthouse Apartment", propertyType: "apartment", listingType: "sale", price: 152000000, bedrooms: 4, bathrooms: 5, areaSqft: 3200, city: "Jabi", state: "Abuja", address: "Jabi, Abuja", imageIds: ["1616047006789-b7af5afb8c20", "1554995207-c18c203602cb", "1560448204-e02f11c3d0e2"] },
  { legacyTitle: "Ikeja GRA Apartment", title: "Ikeja GRA Two-Bedroom Apartment", propertyType: "apartment", listingType: "rent", price: 4200000, bedrooms: 2, bathrooms: 2, areaSqft: 1200, city: "Ikeja GRA", state: "Lagos", address: "Ikeja GRA, Lagos", imageIds: ["1616486338812-3dadae4b4ace", "1652081577415-bfc04074328c", "1522708323590-d24dbb6b0267"] },
  { legacyTitle: "Old GRA Port Harcourt Flat", title: "Port Harcourt Three-Bedroom Flat", propertyType: "apartment", listingType: "rent", price: 3600000, bedrooms: 3, bathrooms: 3, areaSqft: 1600, city: "Port Harcourt", state: "Rivers", address: "Port Harcourt, Rivers", imageIds: ["1505693416388-ac5ce068fe85", "1560448204-e02f11c3d0e2", "1484154218962-a197022b5858"] },
  { legacyTitle: "Ring Road City Apartment", title: "Benin City Two-Bedroom Apartment", propertyType: "apartment", listingType: "sale", price: 39500000, bedrooms: 2, bathrooms: 2, areaSqft: 1000, city: "Benin City", state: "Edo", address: "Benin City, Edo", imageIds: ["1560448204-e02f11c3d0e2", "1502672260266-1c1ef2d93688", "1493809842364-78817add7ffb"] },
  { legacyTitle: "Epe Residential Plot", title: "Epe Residential Plot", propertyType: "land", listingType: "sale", price: 12500000, bedrooms: null, bathrooms: null, areaSqft: 6480, city: "Epe", state: "Lagos", address: "Epe, Lagos", imageIds: ["1500382017468-9049fed747ef", "1623411579348-548e4c9d99fb", "1500530855697-b586d89ba3ee"] },
  { legacyTitle: "Ibeju-Lekki Dry Land Parcel", title: "Ibeju-Lekki Dry Land Parcel", propertyType: "land", listingType: "sale", price: 18500000, bedrooms: null, bathrooms: null, areaSqft: 5400, city: "Ibeju-Lekki", state: "Lagos", address: "Ibeju-Lekki, Lagos", imageIds: ["1464822759023-fed622ff2c3b", "1500534623283-312aade485b7", "1500382017468-9049fed747ef"] },
  { legacyTitle: "Lugbe Mixed-Use Land", title: "Lugbe Mixed-Use Land", propertyType: "land", listingType: "sale", price: 22000000, bedrooms: null, bathrooms: null, areaSqft: 7200, city: "Lugbe", state: "Abuja", address: "Lugbe, Abuja", imageIds: ["1500530855697-b586d89ba3ee", "1685222253612-0d6ee3487be2", "1473773508845-188df298d2d1"] },
  { legacyTitle: "Moniya Development Plot", title: "Ibadan Development Plot", propertyType: "land", listingType: "sale", price: 8500000, bedrooms: null, bathrooms: null, areaSqft: 5000, city: "Ibadan", state: "Oyo", address: "Ibadan, Oyo", imageIds: ["1447752875215-b2761acb3c5d", "1623411839339-b0f69bbd2064", "1469474968028-56623f02e42e"] },
  { legacyTitle: "Apo Resettlement Plot", title: "Apo Residential Plot", propertyType: "land", listingType: "sale", price: 36000000, bedrooms: null, bathrooms: null, areaSqft: 9000, city: "Apo", state: "Abuja", address: "Apo, Abuja", imageIds: ["1500534314209-a25ddb2bd429", "1506744038136-46273834b3fb", "1470770841072-f978cf4d019e"] },
  { legacyTitle: "Eleko Beachfront Land", title: "Eleko Open Land Parcel", propertyType: "land", listingType: "sale", price: 28000000, bedrooms: null, bathrooms: null, areaSqft: 10000, city: "Eleko", state: "Lagos", address: "Eleko, Lagos", imageIds: ["1500534623283-312aade485b7", "1706398978116-403d732ed775", "1464822759023-fed622ff2c3b"] },
  { legacyTitle: "Mpape Hillside Plot", title: "Mpape Hillside Plot", propertyType: "land", listingType: "sale", price: 16500000, bedrooms: null, bathrooms: null, areaSqft: 6400, city: "Mpape", state: "Abuja", address: "Mpape, Abuja", imageIds: ["1506744038136-46273834b3fb", "1500534314209-a25ddb2bd429", "1500530855697-b586d89ba3ee"] },
  { legacyTitle: "Awka Commercial Land", title: "Awka Commercial Land", propertyType: "land", listingType: "sale", price: 24500000, bedrooms: null, bathrooms: null, areaSqft: 8200, city: "Awka", state: "Anambra", address: "Awka, Anambra", imageIds: ["1473773508845-188df298d2d1", "1500382017468-9049fed747ef", "1623411579348-548e4c9d99fb"] },
  { legacyTitle: "Osogbo Estate Plot", title: "Osogbo Estate Plot", propertyType: "land", listingType: "sale", price: 7200000, bedrooms: null, bathrooms: null, areaSqft: 4800, city: "Osogbo", state: "Osun", address: "Osogbo, Osun", imageIds: ["1469474968028-56623f02e42e", "1447752875215-b2761acb3c5d", "1470770841072-f978cf4d019e"] },
  { legacyTitle: "Abeokuta Gateway Land", title: "Abeokuta Gateway Land", propertyType: "land", listingType: "sale", price: 9800000, bedrooms: null, bathrooms: null, areaSqft: 6000, city: "Abeokuta", state: "Ogun", address: "Abeokuta, Ogun", imageIds: ["1470770841072-f978cf4d019e", "1685222253612-0d6ee3487be2", "1500530855697-b586d89ba3ee"] },
  { legacyTitle: "Victoria Island Retail Showroom", title: "Victoria Island Retail Showroom", propertyType: "commercial", listingType: "rent", price: 18000000, bedrooms: null, bathrooms: 3, areaSqft: 4500, city: "Victoria Island", state: "Lagos", address: "Victoria Island, Lagos", imageIds: ["1486406146926-c627a92ad1ab", "1572457403736-88ead9cf03ba", "1497366216548-37526070297c"] },
  { legacyTitle: "Lekki Phase 1 Office Suite", title: "Lekki Phase 1 Office Suite", propertyType: "commercial", listingType: "rent", price: 14500000, bedrooms: null, bathrooms: 4, areaSqft: 3800, city: "Lekki Phase 1", state: "Lagos", address: "Lekki Phase 1, Lagos", imageIds: ["1497366216548-37526070297c", "1652081577415-bfc04074328c", "1497366811353-6870744d04b2"] },
  { legacyTitle: "Ikeja Warehouse Facility", title: "Ikeja Warehouse Facility", propertyType: "commercial", listingType: "rent", price: 22000000, bedrooms: null, bathrooms: 4, areaSqft: 12500, city: "Ikeja", state: "Lagos", address: "Ikeja, Lagos", imageIds: ["1715026323282-073e1a65576a", "1685459143178-2c24b66d44df", "1694885169342-909981fb408a"] },
  { legacyTitle: "Wuse 2 Corporate Office", title: "Wuse 2 Corporate Office", propertyType: "commercial", listingType: "sale", price: 320000000, bedrooms: null, bathrooms: 6, areaSqft: 9000, city: "Wuse 2", state: "Abuja", address: "Wuse 2, Abuja", imageIds: ["1497366811353-6870744d04b2", "1486406146926-c627a92ad1ab", "1497366216548-37526070297c"] },
  { legacyTitle: "Port Harcourt Shopfront", title: "Port Harcourt Shopfront", propertyType: "commercial", listingType: "rent", price: 6500000, bedrooms: null, bathrooms: 2, areaSqft: 1800, city: "Port Harcourt", state: "Rivers", address: "Port Harcourt, Rivers", imageIds: ["1497215842964-222b430dc094", "1572457403736-88ead9cf03ba", "1486406146926-c627a92ad1ab"] },
  { legacyTitle: "Surulere Mixed-Use Block", title: "Surulere Mixed-Use Commercial Block", propertyType: "commercial", listingType: "sale", price: 135000000, bedrooms: null, bathrooms: 5, areaSqft: 7200, city: "Surulere", state: "Lagos", address: "Surulere, Lagos", imageIds: ["1481277542470-605612bd2d61", "1497366754035-f200968a6e72", "1572457403736-88ead9cf03ba"] },
  { legacyTitle: "Garki Medical Office Space", title: "Garki Medical Office Space", propertyType: "commercial", listingType: "rent", price: 9800000, bedrooms: null, bathrooms: 4, areaSqft: 2600, city: "Garki", state: "Abuja", address: "Garki, Abuja", imageIds: ["1518005020951-eccb494ad742", "1497366216548-37526070297c", "1497366811353-6870744d04b2"] },
  { legacyTitle: "Enugu Roadside Plaza", title: "Enugu Roadside Plaza", propertyType: "commercial", listingType: "sale", price: 88000000, bedrooms: null, bathrooms: 4, areaSqft: 6400, city: "Enugu", state: "Enugu", address: "Enugu, Enugu", imageIds: ["1464938050520-ef2270bb8ce8", "1572457403736-88ead9cf03ba", "1486406146926-c627a92ad1ab"] },
  { legacyTitle: "Kano Trade Centre Unit", title: "Kano Trade Centre Unit", propertyType: "commercial", listingType: "rent", price: 7200000, bedrooms: null, bathrooms: 3, areaSqft: 3000, city: "Kano", state: "Kano", address: "Kano, Kano", imageIds: ["1504384308090-c894fdcc538d", "1497215842964-222b430dc094", "1497366216548-37526070297c"] },
  { legacyTitle: "Apapa Logistics Yard", title: "Apapa Logistics Yard", propertyType: "commercial", listingType: "sale", price: 410000000, bedrooms: null, bathrooms: 8, areaSqft: 24000, city: "Apapa", state: "Lagos", address: "Apapa, Lagos", imageIds: ["1694885169342-909981fb408a", "1715026323282-073e1a65576a", "1685459143178-2c24b66d44df"] },
];

const descriptionByType = {
  house: (city, state) =>
    `A move-in-ready family home in ${city}, ${state}, with practical living areas, secure parking, and access to everyday amenities.`,
  apartment: (city, state) =>
    `A well-finished apartment in ${city}, ${state}, suited for city living with modern fittings, efficient room layouts, and convenient access to daily services.`,
  land: (city, state) =>
    `A documented land opportunity around ${city}, ${state}, suitable for residential or mixed-use planning subject to local approvals.`,
  commercial: (city, state) =>
    `A functional commercial property around ${city}, ${state}, suitable for office, retail, service, or logistics use with broad access routes.`,
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

const titles = Array.from(
  new Set(listings.flatMap(({ legacyTitle, title }) => [legacyTitle, title]).filter(Boolean))
);
await requireOk(
  supabase.from("properties").delete().in("title", titles),
  "Clear existing seeded properties"
);

const now = Date.now();
const rows = listings.map((listing, index) => {
  const { title, propertyType, listingType, price, bedrooms, bathrooms, areaSqft, city, state, address, imageIds } = listing;
  const agent = agents[index % agents.length];
  return {
    title,
    description: `${descriptionByType[propertyType](city, state)} Listed with verified agent support through AbodeSpot.`,
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
    images: imageIds.map(img),
    agent_id: agent.id,
    status: "approved",
    featured: index % 7 === 0,
    views: 0,
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
