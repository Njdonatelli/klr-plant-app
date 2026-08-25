import { Link } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import type { Plant } from "../types";
import { CATEGORY_LABELS } from "../types";
import ImagePlaceholder from "./ImagePlaceholder";
import ZoneBadge from "./ZoneBadge";
import { useStore } from "../store/useStore";

export default function PlantCard({ plant }: { plant: Plant }) {
  const isSelected = useStore((s) => s.selectedIds.has(plant.id));
  const toggleSelected = useStore((s) => s.toggleSelected);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <Link to={`/plant/${plant.id}`} className="block h-36 w-full overflow-hidden bg-gray-50">
        <ImagePlaceholder category={plant.category} imageUrl={plant.imageUrl} />
      </Link>

      <button
        onClick={() => toggleSelected(plant.id)}
        className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition ${
          isSelected
            ? "border-klr-600 bg-klr-600 text-white"
            : "border-gray-200 bg-white/90 text-gray-500 hover:border-klr-400 hover:text-klr-600"
        }`}
        title={isSelected ? "Remove from care document" : "Add to care document"}
      >
        {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link to={`/plant/${plant.id}`}>
          <h3 className="line-clamp-1 text-sm font-semibold text-gray-900 hover:text-klr-700">
            {plant.commonName}
          </h3>
        </Link>
        <p className="line-clamp-1 text-xs italic text-gray-500">{plant.botanicalName || "—"}</p>
        <p className="text-[11px] uppercase tracking-wide text-gray-400">
          {CATEGORY_LABELS[plant.category] ?? plant.category}
        </p>
        <div className="mt-auto pt-1">
          <ZoneBadge plant={plant} compact />
        </div>
      </div>
    </div>
  );
}
