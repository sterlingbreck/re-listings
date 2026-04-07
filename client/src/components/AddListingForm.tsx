import { useState, type FormEvent } from 'react';

interface Props {
  onAdd: (url: string) => void | Promise<void>;
  busy: boolean;
}

export function AddListingForm({ onAdd, busy }: Props) {
  const [url, setUrl] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    await onAdd(trimmed);
    setUrl('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:p-4"
    >
      <label htmlFor="add-url" className="sr-only">
        Listing URL
      </label>
      <input
        id="add-url"
        type="url"
        required
        placeholder="Paste a listing URL (e.g. apartments.com/...)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={busy}
        className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-neutral-100"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-50"
      >
        {busy ? 'Adding…' : 'Add new listing'}
      </button>
    </form>
  );
}
