import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'listings.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    thumbnail TEXT,
    price INTEGER,
    address TEXT,
    city TEXT,
    bedrooms REAL,
    bathrooms REAL,
    comments TEXT,
    rank INTEGER NOT NULL DEFAULT 0,
    unavailable INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`);

// Migrations for existing databases — ADD COLUMN throws if column already exists,
// so swallow that specific error.
function addColumnIfMissing(sql: string) {
  try {
    db.exec(sql);
  } catch (err) {
    if (!/duplicate column name/i.test((err as Error).message)) throw err;
  }
}
addColumnIfMissing(`ALTER TABLE listings ADD COLUMN bathrooms REAL`);
addColumnIfMissing(`ALTER TABLE listings ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 0`);
addColumnIfMissing(`ALTER TABLE listings ADD COLUMN comments TEXT`);
addColumnIfMissing(`ALTER TABLE listings ADD COLUMN unavailable INTEGER NOT NULL DEFAULT 0`);

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
  unavailable: number;
  created_at: number;
}

export interface ListingInput {
  url: string;
  thumbnail?: string | null;
  price?: number | null;
  address?: string | null;
  city?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  comments?: string | null;
}

export interface ListingUpdate {
  thumbnail?: string | null;
  price?: number | null;
  address?: string | null;
  city?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  comments?: string | null;
  unavailable?: boolean;
}

const insertStmt = db.prepare(`
  INSERT INTO listings (url, thumbnail, price, address, city, bedrooms, bathrooms, comments, "rank", created_at)
  VALUES (@url, @thumbnail, @price, @address, @city, @bedrooms, @bathrooms, @comments, @rankVal, @created_at)
`);
const updateStmt = db.prepare(`
  UPDATE listings
  SET thumbnail = @thumbnail,
      price = @price,
      address = @address,
      city = @city,
      bedrooms = @bedrooms,
      bathrooms = @bathrooms,
      comments = @comments,
      unavailable = @unavailable
  WHERE id = @id
`);
const selectAllStmt = db.prepare(
  `SELECT * FROM listings ORDER BY unavailable ASC, "rank" DESC, created_at DESC`
);
const selectByIdStmt = db.prepare(`SELECT * FROM listings WHERE id = ?`);
const deleteStmt = db.prepare(`DELETE FROM listings WHERE id = ?`);
const maxRankStmt = db.prepare(`SELECT COALESCE(MAX("rank"), 0) AS m FROM listings`);
const neighborAboveStmt = db.prepare(
  `SELECT * FROM listings WHERE "rank" > ? ORDER BY "rank" ASC LIMIT 1`
);
const neighborBelowStmt = db.prepare(
  `SELECT * FROM listings WHERE "rank" < ? ORDER BY "rank" DESC LIMIT 1`
);
const updateRankStmt = db.prepare(`UPDATE listings SET "rank" = ? WHERE id = ?`);

export function getAllListings(): Listing[] {
  return selectAllStmt.all() as Listing[];
}

export function createListing(input: ListingInput): Listing {
  const nextRank = ((maxRankStmt.get() as { m: number }).m ?? 0) + 1;
  const result = insertStmt.run({
    url: input.url,
    thumbnail: input.thumbnail ?? null,
    price: input.price ?? null,
    address: input.address ?? null,
    city: input.city ?? null,
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    comments: input.comments ?? null,
    rankVal: nextRank,
    created_at: Date.now(),
  });
  return selectByIdStmt.get(result.lastInsertRowid) as Listing;
}

export function updateListing(id: number, fields: ListingUpdate): Listing | null {
  const existing = selectByIdStmt.get(id) as Listing | undefined;
  if (!existing) return null;
  updateStmt.run({
    id,
    thumbnail: fields.thumbnail !== undefined ? fields.thumbnail : existing.thumbnail,
    price: fields.price !== undefined ? fields.price : existing.price,
    address: fields.address !== undefined ? fields.address : existing.address,
    city: fields.city !== undefined ? fields.city : existing.city,
    bedrooms: fields.bedrooms !== undefined ? fields.bedrooms : existing.bedrooms,
    bathrooms: fields.bathrooms !== undefined ? fields.bathrooms : existing.bathrooms,
    comments: fields.comments !== undefined ? fields.comments : existing.comments,
    unavailable:
      fields.unavailable !== undefined ? (fields.unavailable ? 1 : 0) : existing.unavailable,
  });
  return selectByIdStmt.get(id) as Listing;
}

export function deleteListing(id: number): boolean {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}

export type MoveDirection = 'up' | 'down';

/** Swap the rank value of `id` with its immediate neighbor in the chosen direction.
 *  "up" means raise the listing in the displayed list (increase rank).
 *  Returns true if a swap occurred. */
export function moveListing(id: number, direction: MoveDirection): boolean {
  const current = selectByIdStmt.get(id) as Listing | undefined;
  if (!current) return false;
  const neighbor =
    direction === 'up'
      ? (neighborAboveStmt.get(current.rank) as Listing | undefined)
      : (neighborBelowStmt.get(current.rank) as Listing | undefined);
  if (!neighbor) return false;

  const swap = db.transaction(() => {
    updateRankStmt.run(neighbor.rank, current.id);
    updateRankStmt.run(current.rank, neighbor.id);
  });
  swap();
  return true;
}
