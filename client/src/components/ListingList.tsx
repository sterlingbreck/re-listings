import type { Listing } from '../types';
import { ListingCard } from './ListingCard';

interface Props {
  listings: Listing[];
  onDelete: (id: number) => void;
  onMove: (id: number, direction: 'up' | 'down') => void;
  onEdit: (listing: Listing) => void;
}

export function ListingList({ listings, onDelete, onMove, onEdit }: Props) {
  if (listings.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-black/10 bg-white/60 p-10 text-center">
        <p className="text-neutral-500">No listings yet. Paste a URL above to add one.</p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {listings.map((l, i) => (
        <li key={l.id}>
          <ListingCard
            listing={l}
            position={i + 1}
            onDelete={onDelete}
            onMove={onMove}
            onEdit={onEdit}
            isFirst={i === 0}
            isLast={i === listings.length - 1}
          />
        </li>
      ))}
    </ul>
  );
}
