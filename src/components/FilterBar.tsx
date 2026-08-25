import { Search, X } from "lucide-react";
import { CATEGORY_LABELS } from "../types";

export interface Filters {
  query: string;
  category: string;
  sdOnly: boolean;
  caNativeOnly: boolean;
  water: string;
  light: string;
}

export const DEFAULT_FILTERS: Filters = {
  query: "",
  category: "",
  sdOnly: false,
  caNativeOnly: false,
  water: "",
  light: "",
};

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  categories: string[];
  resultCount: number;
}

export default function FilterBar({ filters, onChange, categories, resultCount }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder="Search common or botanical name…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-klr-500 focus:outline-none focus:ring-1 focus:ring-klr-500"
          />
        </div>

        <select
          value={filters.category}
          onChange={(e) => set("category", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-klr-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] ?? c}
            </option>
          ))}
        </select>

        <select
          value={filters.water}
          onChange={(e) => set("water", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-klr-500 focus:outline-none"
        >
          <option value="">Any water need</option>
          <option value="Low">Low water</option>
          <option value="Moderate">Moderate water</option>
          <option value="Regular">Regular water</option>
        </select>

        <select
          value={filters.light}
          onChange={(e) => set("light", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-klr-500 focus:outline-none"
        >
          <option value="">Any light need</option>
          <option value="Shade">Shade</option>
          <option value="Partial Shade">Partial Shade</option>
          <option value="Filtered Sun">Filtered Sun</option>
          <option value="Partial Sun">Partial Sun</option>
          <option value="Full Sun">Full Sun</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={filters.sdOnly}
            onChange={(e) => set("sdOnly", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-klr-600 focus:ring-klr-500"
          />
          San Diego County suited only
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={filters.caNativeOnly}
            onChange={(e) => set("caNativeOnly", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-klr-600 focus:ring-klr-500"
          />
          California native only
        </label>

        <span className="ml-auto text-sm text-gray-500">{resultCount.toLocaleString()} results</span>

        {!isDefault && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="flex items-center gap-1 text-sm font-medium text-klr-700 hover:underline"
          >
            <X className="h-3.5 w-3.5" /> clear filters
          </button>
        )}
      </div>
    </div>
  );
}
