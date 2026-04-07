import type { SortDir, SortField } from '../types';

interface Props {
  field: SortField;
  dir: SortDir;
  onFieldChange: (f: SortField) => void;
  onDirChange: (d: SortDir) => void;
}

export function SortControls({ field, dir, onFieldChange, onDirChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="sort-field" className="font-semibold text-black">
        Sort
      </label>
      <select
        id="sort-field"
        value={field}
        onChange={(e) => onFieldChange(e.target.value as SortField)}
        className="rounded-md border border-black/15 bg-white px-2 py-1 font-medium text-black focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
      >
        <option value="rank">My ranking</option>
        <option value="price">Price</option>
        <option value="bedrooms">Bedrooms</option>
        <option value="bathrooms">Bathrooms</option>
      </select>
      <button
        type="button"
        onClick={() => onDirChange(dir === 'asc' ? 'desc' : 'asc')}
        className="rounded-md border border-black/15 bg-white px-2 py-1 font-medium text-black hover:border-orange-500 hover:text-orange-600"
        aria-label={`Sort ${dir === 'asc' ? 'ascending' : 'descending'}, click to toggle`}
      >
        {dir === 'asc' ? '↑ Low to high' : '↓ High to low'}
      </button>
    </div>
  );
}
