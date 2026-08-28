import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../store/useStore";
import FilterBar, {
  DEFAULT_FILTERS,
  filtersFromParams,
  paramsFromFilters,
  type Filters,
} from "./FilterBar";
import PlantCard from "./PlantCard";
import { NON_PLANT_CATEGORIES } from "../types";
import { sdSuitability } from "../lib/sanDiego";
import { waterBandLabel, lightBandLabel } from "../lib/careTips";
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";

const PAGE_SIZE = 48;

export function applyFilters(plants: ReturnType<typeof useStore.getState>["plants"], filters: Filters) {
  const q = filters.query.trim().toLowerCase();
  return plants.filter((p) => {
    if (q) {
      const hay = `${p.commonName} ${p.botanicalName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.category && p.category !== filters.category) return false;
    if (filters.plantsOnly && NON_PLANT_CATEGORIES.has(p.category)) return false;
    if (filters.sdOnly && sdSuitability(p) !== "suited") return false;
    if (filters.caNativeOnly && !(p.caNative === "Yes" || p.caNative === "Y")) return false;
    if (filters.water) { const wl = waterBandLabel(p); if (!wl || !wl.includes(filters.water)) return false; }
    if (filters.light) { const ll = lightBandLabel(p); if (!ll || !ll.includes(filters.light)) return false; }
    if (filters.minHeightFt) {
      const minFt = parseFloat(filters.minHeightFt);
      const hMax = p.heightMaxM ?? p.heightMinM;
      if (hMax == null || hMax * 3.28084 < minFt) return false;
    }
    if (filters.maxHeightFt) {
      const maxFt = parseFloat(filters.maxHeightFt);
      const hMax = p.heightMaxM ?? p.heightMinM;
      if (hMax == null || hMax * 3.28084 >= maxFt) return false;
    }
    if (filters.minWidthFt) {
      const minFt = parseFloat(filters.minWidthFt);
      const wMax = p.widthMaxM ?? p.widthMinM;
      if (wMax == null || wMax * 3.28084 < minFt) return false;
    }
    if (filters.maxWidthFt) {
      const maxFt = parseFloat(filters.maxWidthFt);
      const wMax = p.widthMaxM ?? p.widthMinM;
      if (wMax == null || wMax * 3.28084 >= maxFt) return false;
    }
    return true;
  });
}

export default function Dashboard() {
  const plants = useStore((s) => s.plants);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(searchParams));
  const [page, setPage] = useState(0);

  // Adopt filters arriving via the URL (Explore chart deep links, shared links,
  // nav clicks that clear the query string) without looping on our own writes.
  useEffect(() => {
    const fromUrl = filtersFromParams(searchParams);
    setFilters((cur) => {
      if (JSON.stringify(fromUrl) === JSON.stringify(cur)) return cur;
      setPage(0);
      return fromUrl;
    });
  }, [searchParams]);

  const categories = useMemo(
    () => [...new Set(plants.map((p) => p.category))].filter(Boolean).sort(),
    [plants]
  );
  const hasNativeData = useMemo(
    () => plants.some((p) => p.caNative === "Yes" || p.caNative === "Y"),
    [plants]
  );

  const filtered = useMemo(() => applyFilters(plants, filters), [plants, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  function updateFilters(f: Filters) {
    setFilters(f);
    setPage(0);
    setSearchParams(paramsFromFilters(f), { replace: true });
  }

  function goToPage(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="mb-4 flex flex-wrap items-end gap-3 sm:mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-klr-900 sm:text-3xl">
            Plant Catalog
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {plants.length.toLocaleString()} varieties · filter for San Diego County conditions,
            then select plants for a client care document.
          </p>
        </div>
        <Link
          to="/explore"
          className="ml-auto hidden items-center gap-1.5 rounded-full border border-klr-200 bg-klr-50 px-3.5 py-1.5 text-xs font-semibold text-klr-800 transition hover:bg-klr-100 sm:inline-flex"
        >
          <BarChart3 className="h-3.5 w-3.5" /> Explore the database
        </Link>
      </div>

      <FilterBar
        filters={filters}
        onChange={updateFilters}
        categories={categories}
        resultCount={filtered.length}
        showNativeFilter={hasNativeData}
      />

      {pageItems.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-400">No plants match these filters.</p>
          <button
            onClick={() => updateFilters(DEFAULT_FILTERS)}
            className="mt-3 text-sm font-medium text-klr-700 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {pageItems.map((p) => (
            <PlantCard key={p.id} plant={p} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            disabled={pageSafe === 0}
            onClick={() => goToPage(Math.max(0, pageSafe - 1))}
            className="btn-secondary !px-3 !py-1.5 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm tabular-nums text-gray-500">
            Page {pageSafe + 1} of {totalPages}
          </span>
          <button
            disabled={pageSafe >= totalPages - 1}
            onClick={() => goToPage(Math.min(totalPages - 1, pageSafe + 1))}
            className="btn-secondary !px-3 !py-1.5 disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
