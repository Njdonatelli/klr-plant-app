import { useMemo, useState } from "react";
import { useStore } from "../store/useStore";
import FilterBar, { DEFAULT_FILTERS, type Filters } from "./FilterBar";
import PlantCard from "./PlantCard";
import { sdSuitability } from "../lib/sanDiego";
import { waterBandLabel, lightBandLabel } from "../lib/careTips";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 48;

export default function Dashboard() {
  const plants = useStore((s) => s.plants);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);

  const categories = useMemo(
    () => [...new Set(plants.map((p) => p.category))].filter(Boolean).sort(),
    [plants]
  );

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return plants.filter((p) => {
      if (q) {
        const hay = `${p.commonName} ${p.botanicalName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.category && p.category !== filters.category) return false;
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
  }, [plants, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  function updateFilters(f: Filters) {
    setFilters(f);
    setPage(0);
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Plant Catalog</h1>
        <p className="text-sm text-gray-500">
          Browse the master catalog, filter for San Diego County conditions, and select
          varieties to include in a client care document.
        </p>
      </div>

      <FilterBar filters={filters} onChange={updateFilters} categories={categories} resultCount={filtered.length} />

      {pageItems.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-400">
          No plants match these filters.
        </div>
      ) : (
        <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {pageItems.map((p) => (
            <PlantCard key={p.id} plant={p} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            disabled={pageSafe === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm text-gray-500">
            Page {pageSafe + 1} of {totalPages}
          </span>
          <button
            disabled={pageSafe >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
