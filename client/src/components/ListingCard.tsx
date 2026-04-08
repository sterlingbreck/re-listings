import type { Listing } from '../types';

interface Props {
  listing: Listing;
  position: number;
  onDelete: (id: number) => void;
  onMove: (id: number, direction: 'up' | 'down') => void;
  onEdit: (listing: Listing) => void;
  onToggleUnavailable: (id: number, next: boolean) => void;
  isFirst: boolean;
  isLast: boolean;
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatBeds(n: number | null): string {
  if (n == null) return '— bd';
  if (n === 0) return 'Studio';
  return `${n % 1 === 0 ? n : n.toFixed(1)} bd`;
}

function formatBaths(n: number | null): string {
  if (n == null) return '— ba';
  return `${n % 1 === 0 ? n : n.toFixed(1)} ba`;
}

export function ListingCard({
  listing,
  position,
  onDelete,
  onMove,
  onEdit,
  onToggleUnavailable,
  isFirst,
  isLast,
}: Props) {
  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-xl border shadow-sm transition ${
        listing.unavailable
          ? 'border-neutral-300 bg-neutral-200 opacity-60 grayscale'
          : 'border-black/10 bg-white hover:-translate-y-0.5 hover:border-orange-500 hover:shadow-lg'
      }`}
    >
      <div className="flex">
      {/* Rank controls */}
      <div className="flex flex-col items-center justify-center gap-1 border-r border-black/5 bg-neutral-50 px-1 py-2 sm:px-2">
        <button
          type="button"
          onClick={() => onMove(listing.id, 'up')}
          disabled={isFirst}
          aria-label="Move up"
          title="Move up"
          className="rounded-md p-1 text-neutral-400 transition hover:bg-orange-100 hover:text-orange-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M14.78 12.78a.75.75 0 01-1.06 0L10 9.06l-3.72 3.72a.75.75 0 11-1.06-1.06l4.25-4.25a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06z" clipRule="evenodd" />
          </svg>
        </button>
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          #{position}
        </span>
        <button
          type="button"
          onClick={() => onMove(listing.id, 'down')}
          disabled={isLast}
          aria-label="Move down"
          title="Move down"
          className="rounded-md p-1 text-neutral-400 transition hover:bg-orange-100 hover:text-orange-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Thumbnail */}
      <div className="aspect-square w-28 flex-shrink-0 bg-neutral-100 sm:w-40 lg:w-52">
        {listing.thumbnail ? (
          <img
            src={listing.thumbnail}
            alt={listing.address ?? 'Listing thumbnail'}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 sm:px-4 sm:py-3">
        <div className="min-w-0 flex-1">
          <div className="text-xl font-extrabold tracking-tight text-black sm:text-2xl">
            {listing.price != null ? usd.format(listing.price) : '—'}
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold text-neutral-900 sm:text-base">
            {listing.address ?? '—'}
          </div>
          <div className="truncate text-xs text-neutral-500 sm:text-sm">{listing.city ?? '—'}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold sm:text-sm">
            <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-orange-700 ring-1 ring-orange-200">
              {formatBeds(listing.bedrooms)}
            </span>
            <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-orange-700 ring-1 ring-orange-200">
              {formatBaths(listing.bathrooms)}
            </span>
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs font-semibold text-orange-600 hover:text-orange-800 sm:text-sm"
            >
              View listing →
            </a>
          </div>
          {listing.comments && (
            <div className="mt-2 rounded-md border border-black/5 bg-neutral-50/60 px-2 py-1.5">
              <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-600">
                OUR COMMENTS
              </div>
              <p className="whitespace-pre-wrap text-xs text-neutral-700 sm:text-sm">
                {listing.comments}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => onToggleUnavailable(listing.id, !listing.unavailable)}
            className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold transition ${
              listing.unavailable
                ? 'border border-green-600 text-green-700 hover:bg-green-50'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            aria-label={listing.unavailable ? 'Mark as available' : 'Mark as unavailable'}
            title={listing.unavailable ? 'Mark as available' : 'Mark as unavailable'}
          >
            {listing.unavailable ? 'Mark Available' : 'Mark Unavailable'}
          </button>
          <button
            type="button"
            onClick={() => onEdit(listing)}
            className="rounded-md p-1 text-green-600 transition hover:bg-green-50 hover:text-green-700"
            aria-label="Edit listing"
            title="Edit listing"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 sm:h-5 sm:w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(listing.id)}
            className="rounded-md p-1 text-red-600 transition hover:bg-red-50 hover:text-red-700"
            aria-label="Delete listing"
            title="Delete listing"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 sm:h-5 sm:w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
      </div>
    </article>
  );
}
