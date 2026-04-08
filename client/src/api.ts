import type { Listing, ScrapeResult } from './types';

function normalizeListing(l: any): Listing {
  return { ...l, unavailable: Boolean(l.unavailable) };
}

export async function fetchListings(): Promise<Listing[]> {
  const res = await fetch('/api/listings');
  if (!res.ok) throw new Error(`Failed to load listings (${res.status})`);
  const body = await res.json();
  return (body as any[]).map(normalizeListing);
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const res = await fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Scrape failed (${res.status})`);
  }
  return res.json();
}

export async function createListing(payload: {
  url: string;
  thumbnail: string | null;
  price: number | null;
  address: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  comments: string | null;
}): Promise<Listing> {
  const res = await fetch('/api/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Save failed (${res.status})`);
  }
  return normalizeListing(await res.json());
}

export async function updateListing(
  id: number,
  payload: {
    thumbnail: string | null;
    price: number | null;
    address: string | null;
    city: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    comments: string | null;
  }
): Promise<Listing> {
  const res = await fetch(`/api/listings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Update failed (${res.status})`);
  }
  return normalizeListing(await res.json());
}

export async function setListingUnavailable(id: number, unavailable: boolean): Promise<Listing> {
  const res = await fetch(`/api/listings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unavailable }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Update failed (${res.status})`);
  }
  return normalizeListing(await res.json());
}

export async function deleteListing(id: number): Promise<void> {
  const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Delete failed (${res.status})`);
  }
}

export async function moveListing(id: number, direction: 'up' | 'down'): Promise<Listing[]> {
  const res = await fetch(`/api/listings/${id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ direction }),
  });
  if (!res.ok) throw new Error(`Move failed (${res.status})`);
  const body = await res.json();
  return (body.listings as any[]).map(normalizeListing);
}
