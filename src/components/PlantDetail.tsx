import { useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { ArrowLeft, Check, Plus, Pencil, Trash2, ExternalLink, Leaf, Info } from "lucide-react";
import { useStore } from "../store/useStore";
import { CATEGORY_LABELS, NON_PLANT_CATEGORIES } from "../types";
import ImagePlaceholder from "./ImagePlaceholder";
import EnvironmentGraphic from "./EnvironmentGraphic";
import ZoneBadge from "./ZoneBadge";
import PlantForm from "./PlantForm";
import { generateCareNotes, lightBandLabel, waterBandLabel } from "../lib/careTips";
import { SD_USDA_ZONES, SD_SUNSET_ZONES, hasAnyZoneData } from "../lib/sanDiego";

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function renderNotes(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) {
      const url = m[2];
      if (isValidHttpUrl(url)) {
        return (
          <a key={i} href={url} target="_blank" rel="noreferrer" className="text-klr-700 underline">
            {m[1]}
          </a>
        );
      }
      return <span key={i}>{m[1]}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

function ZoneGauge({
  label,
  all,
  active,
  sdZones,
  rangeText,
  colorClass,
}: {
  label: string;
  all: number[];
  active: number[];
  sdZones: number[];
  rangeText: string | null;
  colorClass: string;
}) {
  const sortedActive = [...active].sort((a, b) => a - b);
  const lo = sortedActive.length > 0 ? sortedActive[0] : null;
  const hi = sortedActive.length > 0 ? sortedActive[sortedActive.length - 1] : null;
  const scaleMin = all[0];
  const scaleMax = all[all.length - 1];
  const range = scaleMax - scaleMin;
  const hasData = lo != null && hi != null;
  const leftPct = hasData ? ((lo - scaleMin) / range) * 100 : 0;
  const widthPct = hasData ? Math.max(3, ((hi - lo) / range) * 100) : 0;
  // SD county reference band
  const sdLo = sdZones[0];
  const sdHi = sdZones[sdZones.length - 1];
  const sdLeftPct = ((sdLo - scaleMin) / range) * 100;
  const sdWidthPct = Math.max(3, ((sdHi - sdLo) / range) * 100);

  const overlapLo = hasData ? Math.max(lo, sdLo) : null;
  const overlapHi = hasData ? Math.min(hi, sdHi) : null;
  const overlaps = overlapLo != null && overlapHi != null && overlapLo <= overlapHi;

  const bandLabel = hasData
    ? `Zones ${lo}${hi !== lo ? `–${hi}` : ""}${overlaps ? " · overlaps SD County" : " · no SD County overlap"}`
    : null;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {rangeText || (hasData ? `Zones ${lo}–${hi}` : "no data")}
        </span>
      </div>
      <div className="relative h-6 w-full">
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 h-2 w-full rounded-full bg-gray-100" />
        
        {/* SD county reference band */}
        <div
          className="absolute top-0 h-full rounded-md bg-emerald-100 border border-emerald-300 shadow-sm"
          style={{ left: `${sdLeftPct}%`, width: `${sdWidthPct}%` }}
        />
        
        {/* Plant's active zone band (Base / Caution) */}
        {hasData && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full"
            style={{ 
              left: `${leftPct}%`, 
              width: `${widthPct}%`,
              backgroundImage: "repeating-linear-gradient(45deg, #fcd34d, #fcd34d 4px, #f59e0b 4px, #f59e0b 8px)"
            }}
          />
        )}
        
        {/* Plant's active zone band (Overlap / Optimal) */}
        {hasData && overlaps && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 h-2 ${colorClass}`}
            style={{ 
              left: `${((overlapLo! - scaleMin) / range) * 100}%`, 
              width: `${Math.max(overlapLo === overlapHi ? 3 : 0, ((overlapHi! - overlapLo!) / range) * 100)}%`,
              borderTopLeftRadius: overlapLo === lo ? '9999px' : '0',
              borderBottomLeftRadius: overlapLo === lo ? '9999px' : '0',
              borderTopRightRadius: overlapHi === hi ? '9999px' : '0',
              borderBottomRightRadius: overlapHi === hi ? '9999px' : '0',
            }}
          />
        )}
      </div>
      {bandLabel && <div className="mt-1 text-xs font-medium text-klr-700">{bandLabel}</div>}
    </div>
  );
}

export default function PlantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Preserve catalog filters/scroll when we came from within the app; fall back
  // to the catalog on a direct deep link (location.key is "default" on entry).
  const goBack = () => (location.key === "default" ? navigate("/") : navigate(-1));
  const plant = useStore((s) => s.plants.find((p) => p.id === id));
  const isSelected = useStore((s) => (id ? s.selectedIds.has(id) : false));
  const toggleSelected = useStore((s) => s.toggleSelected);
  const deletePlant = useStore((s) => s.deletePlant);
  const [editing, setEditing] = useState(false);

  const maxWaterAcrossAllPlants = useStore((s) => 
    Math.max(0, ...s.plants.map(p => Math.max(p.waterMinInWk ?? 0, p.waterMaxInWk ?? 0)))
  );
  const dynamicWaterScaleMax = Math.ceil(maxWaterAcrossAllPlants) + 2;

  if (!plant) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-gray-500">Plant not found -- it may have been removed from the dataset.</p>
        <Link to="/" className="mt-4 inline-block text-klr-700 underline">
          Back to catalog
        </Link>
      </div>
    );
  }

  const isMaterial = NON_PLANT_CATEGORIES.has(plant.category);
  const careNotes = generateCareNotes(plant);
  const sdSuited = hasAnyZoneData(plant);

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-4 sm:py-6">
      <button
        onClick={goBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm transition hover:border-klr-300 hover:text-klr-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="aspect-square w-full overflow-hidden rounded-2xl border border-gray-200 shadow-card">
            <ImagePlaceholder category={plant.category} imageUrl={plant.imageUrl} iconClassName="h-16 w-16 opacity-60" />
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-klr-600">
            {CATEGORY_LABELS[plant.category] ?? plant.category}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-klr-900 sm:text-3xl">{plant.commonName}</h1>
          <p className="italic text-gray-500">{plant.botanicalName || "Botanical name not recorded"}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!isMaterial && <ZoneBadge plant={plant} />}
            {(plant.caNative === "Yes" || plant.caNative === "Y") && (
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-300 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
                <Leaf className="h-3.5 w-3.5" /> California Native
              </span>
            )}
            {plant.wucols && (
              <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
                WUCOLS {plant.wucols}
              </span>
            )}
            {plant.isCustom && (
              <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                Added / edited manually
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => toggleSelected(plant.id)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${
                isSelected ? "bg-klr-600 text-white" : "border border-klr-600 text-klr-700 hover:bg-klr-50"
              }`}
            >
              {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isSelected ? "In care document" : "Add to care document"}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <button
              onClick={() => {
                if (confirm(`Remove "${plant.commonName}" from the dataset? This cannot be undone.`)) {
                  deletePlant(plant.id);
                  navigate("/");
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
            {plant.sourceUrl && isValidHttpUrl(plant.sourceUrl) && (
              <a
                href={plant.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-1 text-sm text-gray-400 hover:text-klr-700"
              >
                Source <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          
          {plant.description && (
            <div className="mt-6 text-gray-700">
              <p className="whitespace-pre-wrap">{plant.description}</p>
            </div>
          )}
        </div>
      </div>

      {isMaterial ? (
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This is a material / hardgood item, not a living plant, so no care dashboard applies. It can still be
            added to a client document as a line item (e.g. soil or mulch called out in a planting plan).
          </p>
        </div>
      ) : (
        <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Care & Environment Card */}
          <div className="card p-4 sm:p-5 lg:col-span-2">
            <h2 className="mb-3 sm:mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Care & Mature Size</h2>
            <div className="space-y-6">
              <EnvironmentGraphic
                lightMin={plant.lightMinHrs}
                lightMax={plant.lightMaxHrs}
                lightScaleMax={8}
                lightBandLabel={lightBandLabel(plant)}
                waterMin={plant.waterMinInWk}
                waterMax={plant.waterMaxInWk}
                waterScaleMax={dynamicWaterScaleMax}
                waterBandLabel={waterBandLabel(plant)}
                heightMinM={plant.heightMinM}
                heightMaxM={plant.heightMaxM}
                widthMinM={plant.widthMinM}
                widthMaxM={plant.widthMaxM}
              />
            </div>
          </div>

          <div className="card p-4 sm:p-5 lg:col-span-2">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
              San Diego County Hardiness Fit
            </h2>
            <p className="mb-4 text-xs text-gray-400">
              Solid colored bars indicate the full range of zones this plant is rated for. The light green background 
              band marks the typical zones for KLR's Oceanside / North County service area and inland San Diego valley sites. 
              Overlap between the solid bar and the light green band indicates a strong regional fit.
            </p>
            {!sdSuited ? (
              <p className="text-sm text-gray-400">No USDA or Sunset zone data on file for this plant.</p>
            ) : (
              <div className="space-y-5">
                <ZoneGauge
                  label="USDA Zones"
                  all={Array.from({ length: 13 }, (_, i) => i + 1)}
                  active={plant.usdaZones}
                  sdZones={SD_USDA_ZONES}
                  rangeText={plant.usdaZoneText || null}
                  colorClass="bg-emerald-500"
                />
                <ZoneGauge
                  label="Sunset Zones"
                  all={Array.from({ length: 24 }, (_, i) => i + 1)}
                  active={plant.sunsetZones}
                  sdZones={SD_SUNSET_ZONES}
                  rangeText={plant.sunsetZoneText || null}
                  colorClass="bg-teal-500"
                />
                <div className="rounded-lg bg-gray-50 p-2 text-[11px] text-gray-400">
                  Reference bands used above: USDA {SD_USDA_ZONES.join("–")}, Sunset {SD_SUNSET_ZONES.join(", ")}.
                  High-elevation east-county sites (Julian, Mt. Laguna) fall outside this default band.
                </div>
              </div>
            )}
          </div>

          <div className="card p-4 sm:p-5 lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Care Notes (draft -- verify before finalizing)
            </h2>
            <ul className="space-y-2 text-sm text-gray-700">
              {careNotes.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-klr-500" />
                  <span>{n}</span>
                </li>
              ))}
              {careNotes.length === 0 && <li className="text-gray-400">No care data on file yet.</li>}
            </ul>
            {plant.supplementalNotes && (
              <div className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-600">
                <span className="font-medium text-gray-800">Notable uses: </span>
                {renderNotes(plant.supplementalNotes)}
              </div>
            )}
          </div>
        </div>
      )}

      {editing && <PlantForm plant={plant} onClose={() => setEditing(false)} />}
    </div>
  );
}
