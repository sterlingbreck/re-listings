export interface Listing {
  id: number;
  url: string;
  thumbnail: string | null;
  price: number | null;
  address: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  comments: string | null;
  rank: number;
  unavailable: boolean;
  created_at: number;
}

export interface ListingFields {
  thumbnail: string | null;
  price: number | null;
  address: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  comments: string | null;
}

export interface ScrapeResult {
  thumbnail: string | null;
  price: number | null;
  address: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  partial: boolean;
  error?: string;
}

export type SortField = 'rank' | 'price' | 'bedrooms' | 'bathrooms';
export type SortDir = 'asc' | 'desc';
