import type { PropertyType, ListingType } from "./types";

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

export const LISTING_TYPES: { value: ListingType; label: string }[] = [
  { value: "sale", label: "For Sale" },
  { value: "rent", label: "For Rent" },
];

export const PROPERTY_FEATURES = [
  "Parking",
  "Pool",
  "Garden",
  "Security",
  "Gym",
  "Balcony",
  "Air Conditioning",
  "Heating",
  "Furnished",
  "Pet Friendly",
];
