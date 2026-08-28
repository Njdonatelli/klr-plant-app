import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { CATEGORY_LABELS } from "../types";
import DualRangeSlider from "./DualRangeSlider";

export interface Filters {
  query: string;
  category: string;
  sdOnly: boolean;
  caNativeOnly: boolean;
  plantsOnly: boolean;
  water: string;
  light: string;
  minHeightFt: string;
  maxHeightFt: string;
  minWidthFt: string;
  maxWidthFt: string;
}

export const DEFAULT_FILTERS: Filters = {
  query: "",
  category: "",
  sdOnly: false,
  caNativeOnly: false,
  plantsOnly: false,
  water: "",
  light: "",
  minHeightFt: "",
  maxHeightFt: "",
  minWidthFt: "",
  maxWidthFt: "",
};

/** Round-trip filters <-> URL search params so charts and links can open a pre-filtered catalog. */
export function filtersFromParams(params: URLSearchParams): Filters {
  return {
    query: params.get("q") ?? "",
    category: params.get("category") ?? "",
    sdOnly: params.get("sd") === "1",
    caNativeOnly: params.get("native") === "1",
    plantsOnly: params.get("plants") === "1",
    water: params.get("water") ?? "",
    light: params.get("light") ?? "",
    minHeightFt: params.get("hmin") ?? "",
    maxHeightFt: params.get("hmax") ?? "",
    minWidthFt: params.get("wmin") ?? "",
    maxWidthFt: params.get("wmax") ?? "",
  };
}

export function paramsFromFilters(f: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.query) params.set("q", f.query);
  if (f.category) params.set("category", f.category);
  if (f.sdOnly) params.set("sd", "1");
  if (f.caNativeOnly) params.set("native", "1");
  if (f.plantsOnly) params.set("plants", "1");
  if (f.water) params.set("water", f.water);
  if (f.light) params.set("light", f.light);
  if (f.minHeightFt) params.set("hmin", f.minHeightFt);
  if (f.maxHeightFt) params.set("hmax", f.maxHeightFt);
  if (f.minWidthFt) params.set("wmin", f.minWidthFt);
  if (f.maxWidthFt) params.set("wmax", f.maxWidthFt);
  return params;
}

function countActive(f: Filters): number {
  let n = 0;
  if (f.category) n++;
  if (f.water) n++;
  if (f.light) n++;
  if (f.sdOnly) n++;
  if (f.caNativeOnly) n++;
  if (f.plantsOnly) n++;
  if (f.minHeightFt || f.maxHeightFt) n++;
  if (f.minWidthFt || f.maxWidthFt) n++;
  return n;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  categories: string[];
  resultCount: number;
  /** Whether any plant in the dataset carries a CA-native flag (baseline ships without them). */
  showNativeFilter?: boolean;
}

export default function FilterBar({ filters, onChange, categories, resultCount, showNativeFilter }: Props) {
  const [expanded, setExpanded] = useState(false);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  const activeCount = countActive(filters);
  const isDefault = activeCount === 0 && !filters.query;

  return (
    <div className="card p-3 sm:p-4">
      {/* Search + mobile filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder="Search common or botanical name…"
            className="w-full rounded-xl border border-gray-300 bg-stone-50/50 py-2.5 pl-9 pr-3 text-sm focus:border-klr-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-klr-500"
          />
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`relative flex items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition sm:hidden ${
            expanded || activeCount > 0
              ? "border-klr-600 bg-klr-50 text-klr-800"
              : "border-gray-300 text-gray-600"
          }`}
          aria-expanded={expanded}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-klr-600 px-1 text-[10px] font-bold leading-none text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced filters — always open on >=sm, collapsible on mobile */}
      <div className={`${expanded ? "block" : "hidden"} sm:block`}>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          <select
            value={filters.category}
            onChange={(e) => set("category", e.target.value)}
            className="input"
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
            className="input"
          >
            <option value="">Any water need</option>
            <option value="Low">Low water</option>
            <option value="Moderate">Moderate water</option>
            <option value="Regular">Regular water</option>
          </select>

          <select
            value={filters.light}
            onChange={(e) => set("light", e.target.value)}
            className="input"
          >
            <option value="">Any light need</option>
            <option value="Shade">Shade</option>
            <option value="Partial Shade">Partial Shade</option>
            <option value="Filtered Sun">Filtered Sun</option>
            <option value="Partial Sun">Partial Sun</option>
            <option value="Full Sun">Full Sun</option>
          </select>

          <DualRangeSlider
            label="Height"
            min={0}
            max={100}
            step={1}
            valueLow={filters.minHeightFt ? Number(filters.minHeightFt) : 0}
            valueHigh={filters.maxHeightFt ? Number(filters.maxHeightFt) : 100}
            unit="ft"
            onChangeLow={(v) => set("minHeightFt", v === 0 ? "" : String(v))}
            onChangeHigh={(v) => set("maxHeightFt", v === 100 ? "" : String(v))}
          />

          <DualRangeSlider
            label="Width"
            min={0}
            max={50}
            step={1}
            valueLow={filters.minWidthFt ? Number(filters.minWidthFt) : 0}
            valueHigh={filters.maxWidthFt ? Number(filters.maxWidthFt) : 50}
            unit="ft"
            onChangeLow={(v) => set("minWidthFt", v === 0 ? "" : String(v))}
            onChangeHigh={(v) => set("maxWidthFt", v === 50 ? "" : String(v))}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={filters.sdOnly}
              onChange={(e) => set("sdOnly", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-klr-600 focus:ring-klr-500"
            />
            San Diego suited
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={filters.plantsOnly}
              onChange={(e) => set("plantsOnly", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-klr-600 focus:ring-klr-500"
            />
            Living plants only
          </label>
          {(showNativeFilter || filters.caNativeOnly) && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={filters.caNativeOnly}
                onChange={(e) => set("caNativeOnly", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-klr-600 focus:ring-klr-500"
              />
              CA native
            </label>
          )}
        </div>
      </div>

      {/* Result count + clear — always visible */}
      <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
        <span className="text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{resultCount.toLocaleString()}</span>{" "}
          result{resultCount === 1 ? "" : "s"}
        </span>
        {!isDefault && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="ml-auto flex items-center gap-1 text-sm font-medium text-klr-700 hover:underline"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
