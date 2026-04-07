import { useState, type FormEvent } from 'react';
import type { Listing } from '../types';

interface Props {
  listing: Listing;
  onCancel: () => void;
  onSubmit: (data: {
    thumbnail: string | null;
    price: number | null;
    address: string | null;
    city: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    comments: string | null;
  }) => void | Promise<void>;
}

export function EditListingForm({ listing, onCancel, onSubmit }: Props) {
  const [thumbnail, setThumbnail] = useState(listing.thumbnail ?? '');
  const [price, setPrice] = useState(listing.price != null ? String(listing.price) : '');
  const [address, setAddress] = useState(listing.address ?? '');
  const [city, setCity] = useState(listing.city ?? '');
  const [bedrooms, setBedrooms] = useState(
    listing.bedrooms != null ? String(listing.bedrooms) : ''
  );
  const [bathrooms, setBathrooms] = useState(
    listing.bathrooms != null ? String(listing.bathrooms) : ''
  );
  const [comments, setComments] = useState(listing.comments ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        thumbnail: thumbnail.trim() || null,
        price: price.trim() ? Number(price) : null,
        address: address.trim() || null,
        city: city.trim() || null,
        bedrooms: bedrooms.trim() ? Number(bedrooms) : null,
        bathrooms: bathrooms.trim() ? Number(bathrooms) : null,
        comments: comments.trim() || null,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-form-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-black/10 bg-white p-6 shadow-2xl sm:rounded-2xl">
        <h2 id="edit-form-title" className="text-lg font-bold text-black">
          Edit listing
        </h2>
        <p className="mt-2 truncate text-xs text-neutral-400" title={listing.url}>
          {listing.url}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <Field label="Price (USD)" type="number" value={price} onChange={setPrice} placeholder="e.g. 4500" />
          <Field label="Address" value={address} onChange={setAddress} placeholder="123 Main St" />
          <Field label="City" value={city} onChange={setCity} placeholder="San Juan Capistrano" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bedrooms" type="number" step="0.5" value={bedrooms} onChange={setBedrooms} placeholder="3" />
            <Field label="Bathrooms" type="number" step="0.5" value={bathrooms} onChange={setBathrooms} placeholder="2.5" />
          </div>
          <Field label="Thumbnail image URL" value={thumbnail} onChange={setThumbnail} placeholder="https://…" />

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-black">My Comments</span>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              placeholder="Add your notes about this listing…"
              className="resize-y rounded-md border border-black/15 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </label>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
}

function Field({ label, value, onChange, type = 'text', step, placeholder }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold text-black">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-black/15 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
      />
    </label>
  );
}
