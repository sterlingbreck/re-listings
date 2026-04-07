import { useEffect, useMemo, useState } from 'react';
import { AddListingForm } from './components/AddListingForm';
import { EditListingForm } from './components/EditListingForm';
import { ListingList } from './components/ListingList';
import { ManualEntryForm } from './components/ManualEntryForm';
import { SortControls } from './components/SortControls';
import * as api from './api';
import type { Listing, ScrapeResult, SortDir, SortField } from './types';

interface PendingManual {
  url: string;
  initial: Partial<ScrapeResult>;
  scrapeError?: string;
}

function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [pendingManual, setPendingManual] = useState<PendingManual | null>(null);
  const [editing, setEditing] = useState<Listing | null>(null);

  useEffect(() => {
    api
      .fetchListings()
      .then(setListings)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const copy = [...listings];
    copy.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      // Push nulls to the end regardless of direction
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return copy;
  }, [listings, sortField, sortDir]);

  async function handleAdd(url: string) {
    setBusy(true);
    setError(null);
    try {
      const scrape = await api.scrapeUrl(url);
      if (scrape.partial || scrape.error) {
        setPendingManual({ url, initial: scrape, scrapeError: scrape.error });
        return;
      }
      const created = await api.createListing({
        url,
        thumbnail: scrape.thumbnail,
        price: scrape.price,
        address: scrape.address,
        city: scrape.city,
        bedrooms: scrape.bedrooms,
        bathrooms: scrape.bathrooms,
        comments: null,
      });
      setListings((prev) => [created, ...prev]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleManualSubmit(data: {
    thumbnail: string | null;
    price: number | null;
    address: string | null;
    city: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    comments: string | null;
  }) {
    if (!pendingManual) return;
    const created = await api.createListing({ url: pendingManual.url, ...data });
    setListings((prev) => [created, ...prev]);
    setPendingManual(null);
  }

  async function handleEditSubmit(data: {
    thumbnail: string | null;
    price: number | null;
    address: string | null;
    city: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    comments: string | null;
  }) {
    if (!editing) return;
    const updated = await api.updateListing(editing.id, data);
    setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setEditing(null);
  }

  async function handleDelete(id: number) {
    const prev = listings;
    setListings((ls) => ls.filter((l) => l.id !== id));
    try {
      await api.deleteListing(id);
    } catch (e) {
      setError((e as Error).message);
      setListings(prev);
    }
  }

  async function handleMove(id: number, direction: 'up' | 'down') {
    try {
      const updated = await api.moveListing(id, direction);
      setListings(updated);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="min-h-full">
      <header className="border-b-2 border-orange-500 bg-black">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
          <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            RE <span className="text-orange-500">Listings</span>
          </h1>
          <p className="text-sm text-neutral-400">
            Track real estate listings you're interested in.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:max-w-4xl">
        <div className="flex flex-col gap-4">
          <AddListingForm onAdd={handleAdd} busy={busy} />

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-2 font-semibold underline"
              >
                dismiss
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              {listings.length} {listings.length === 1 ? 'listing' : 'listings'}
            </h2>
            <SortControls
              field={sortField}
              dir={sortDir}
              onFieldChange={setSortField}
              onDirChange={setSortDir}
            />
          </div>

          {loading ? (
            <div className="text-center text-neutral-500">Loading…</div>
          ) : (
            <ListingList
              listings={sorted}
              onDelete={handleDelete}
              onMove={handleMove}
              onEdit={setEditing}
            />
          )}
        </div>
      </main>

      {pendingManual && (
        <ManualEntryForm
          url={pendingManual.url}
          initial={pendingManual.initial}
          scrapeError={pendingManual.scrapeError}
          onCancel={() => setPendingManual(null)}
          onSubmit={handleManualSubmit}
        />
      )}

      {editing && (
        <EditListingForm
          listing={editing}
          onCancel={() => setEditing(null)}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
}

export default App;
