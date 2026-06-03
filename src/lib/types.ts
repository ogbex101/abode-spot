export type PropertyType = "house" | "apartment" | "land" | "commercial";
export type ListingType = "sale" | "rent";
export type PropertyStatus = "pending" | "approved" | "rejected" | "sold";
export type AppRole = "admin" | "agent" | "user" | "pending_agent";
export type InquiryStatus = "unread" | "read" | "replied";

export interface Property {
  id: string;
  title: string;
  description: string | null;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  property_type: PropertyType;
  listing_type: ListingType;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  images: string[];
  agent_id: string | null;
  status: PropertyStatus;
  featured: boolean;
  views: number;
  created_at: string;
  // joined
  agent?: AppUser | null;
}

export interface AppUser {
  id: string;
  email: string;
  role: AppRole;
  is_verified: boolean;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface SavedProperty {
  id: string;
  user_id: string;
  property_id: string;
  saved_at: string;
}

export interface Inquiry {
  id: string;
  property_id: string;
  user_id: string;
  message: string;
  status: InquiryStatus;
  created_at: string;
  property?: Property | null;
  user?: AppUser | null;
}
