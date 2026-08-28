import { Link } from "react-router-dom";
import { Check, Plus, Sun, Droplets, MoveVertical } from "lucide-react";
import type { Plant } from "../types";
import { CATEGORY_LABELS, NON_PLANT_CATEGORIES } from "../types";
import ImagePlaceholder from "./ImagePlaceholder";
import ZoneBadge from "./ZoneBadge";
import { useStore } from "../store/useStore";
import { metersToFeetLabel } from "../lib/units";
import { waterBandLabel } from "../lib/careTips";

// Abbreviate band labels ("Low – Moderate (adaptable)" -> "Low–Mod") for card-sized chips.
const WATER_SHORT: Record<string, string> = {
  Low: "Low",
  Moderate: "Mod",
  Regular: "Reg",
};
function shortWater(p: Plant): string | null {
  const label = waterBandLabel(p);
  if (!label) return null;
  const parts = label.replace(" (adaptable)", "").split(" – ");
  return parts.map((w) => WATER_SHORT[w] ?? w).join("–");
}

function Fact({ icon: Icon, text }: { icon: typeof Sun; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
      <Icon className="h-3 w-3 text-klr-500" />
      {text}
    </span>
  );
}

export default function PlantCard({ plant }: { plant: Plant }) {
  const isSelected = useStore((s) => s.selectedIds.has(plant.id));
  const toggleSelected = useStore((s) => s.toggleSelected);

  const isMaterial = NON_PLANT_CATEGORIES.has(plant.category);
  const lightFact =
    plant.lightMinHrs != null || plant.lightMaxHrs != null
      ? `${plant.lightMinHrs ?? plant.lightMaxHrs}${
          plant.lightMaxHrs != null && plant.lightMaxHrs !== (plant.lightMinHrs ?? plant.lightMaxHrs)
            ? `–${plant.lightMaxHrs}`
            : ""
        }h sun`
      : null;
  const waterFact = shortWater(plant);
  const heightFact = metersToFeetLabel(plant.heightMinM, plant.heightMaxM);

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${
        isSelected ? "border-klr-400 ring-1 ring-klr-400" : "border-gray-200"
      }`}
    >
      <Link to={`/plant/${plant.id}`} className="block h-32 w-full overflow-hidden bg-gray-50 sm:h-36">
        <div className="h-full w-full transition duration-300 group-hover:scale-[1.04]">
          <ImagePlaceholder category={plant.category} imageUrl={plant.imageUrl} />
        </div>
      </Link>

      <button
        onClick={() => toggleSelected(plant.id)}
        aria-label={isSelected ? "Remove from care document" : "Add to care document"}
        className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition sm:h-8 sm:w-8 ${
          isSelected
            ? "border-klr-600 bg-klr-600 text-white"
            : "border-gray-200 bg-white/95 text-gray-500 hover:border-klr-400 hover:text-klr-600"
        }`}
        title={isSelected ? "Remove from care document" : "Add to care document"}
      >
        {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-klr-600">
          {CATEGORY_LABELS[plant.category] ?? plant.category}
        </p>
        <Link to={`/plant/${plant.id}`}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 hover:text-klr-700">
            {plant.commonName}
          </h3>
        </Link>
        <p className="line-clamp-1 text-xs italic text-gray-500">{plant.botanicalName || "—"}</p>

        {!isMaterial && (lightFact || waterFact || heightFact) && (
          <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1">
            {lightFact && <Fact icon={Sun} text={lightFact} />}
            {waterFact && <Fact icon={Droplets} text={waterFact} />}
            {heightFact && <Fact icon={MoveVertical} text={heightFact} />}
          </div>
        )}

        <div className="mt-auto pt-1.5">
          <ZoneBadge plant={plant} compact />
        </div>
      </div>
    </div>
  );
}
