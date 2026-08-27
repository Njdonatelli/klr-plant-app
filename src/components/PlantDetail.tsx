import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Check, Plus, Pencil, Trash2, ExternalLink, Leaf, Info } from "lucide-react";
import { useStore } from "../store/useStore";
import { CATEGORY_LABELS, NON_PLANT_CATEGORIES } from "../types";
import ImagePlaceholder from "./ImagePlaceholder";
import Gauge from "./Gauge";
import SizeChart from "./SizeChart";
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

function ZoneChips({ all, active, label }: { all: number[]; active: number[]; label: string }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</div>
      <div className="flex flex-wrap gap-1">
        {all.map((z) => {
          const on = active.includes(z);
          return (
            <span
              key={z}
              className={`flex h-6 min-w-[1.5rem] items-center justify-center rounded px-1 text-[11px] font-medium ${
                on ? "bg-klr-600 text-white" : "bg-gray-100 text-gray-300"
              }`}
            >
              {z}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function PlantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const plant = useStore((s) => s.plants.find((p) => p.id === id));
  const isSelected = useStore((s) => (id ? s.selectedIds.has(id) : false));
  const toggleSelected = useStore((s) => s.toggleSelected);
  const deletePlant = useStore((s) => s.deletePlant);
  const [editing, setEditing] = useState(false);

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
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button onClick={() => navigate("/")} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> Back to catalog
      </button>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="aspect-square w-full overflow-hidden rounded-xl border border-gray-200">
            <ImagePlaceholder category={plant.category} imageUrl={plant.imageUrl} iconClassName="h-16 w-16 opacity-60" />
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-klr-600">
            {CATEGORY_LABELS[plant.category] ?? plant.category}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{plant.commonName}</h1>
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
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Care Requirements</h2>
            <div className="space-y-5">
              <Gauge
                label="Light"
                min={plant.lightMinHrs}
                max={plant.lightMaxHrs}
                scaleMax={8}
                unit="hrs/day"
                bandLabel={lightBandLabel(plant)}
                colorClass="bg-amber-400"
              />
              <Gauge
                label="Water"
                min={plant.waterMinInWk}
                max={plant.waterMaxInWk}
                scaleMax={2}
                unit="in/wk"
                bandLabel={waterBandLabel(plant)}
                colorClass="bg-sky-500"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Mature Size</h2>
            <SizeChart
              heightMinM={plant.heightMinM}
              heightMaxM={plant.heightMaxM}
              widthMinM={plant.widthMinM}
              widthMaxM={plant.widthMaxM}
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
              San Diego County Hardiness Fit
            </h2>
            <p className="mb-4 text-xs text-gray-400">
              Highlighted zones are the zone bands this plant is rated for. Darker chips overlapping the
              green-highlighted "SD County" reference row indicate a strong regional fit for KLR's Oceanside /
              North County service area and typical inland San Diego valley sites.
            </p>
            {!sdSuited ? (
              <p className="text-sm text-gray-400">No USDA or Sunset zone data on file for this plant.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="mb-1 text-xs text-gray-400">
                    USDA range on file: <span className="font-medium text-gray-600">{plant.usdaZoneText || "—"}</span>
                  </div>
                  <ZoneChips all={Array.from({ length: 13 }, (_, i) => i + 1)} active={plant.usdaZones} label="USDA Zones (San Diego County ≈ 9–10)" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-gray-400">
                    Sunset range on file: <span className="font-medium text-gray-600">{plant.sunsetZoneText || "—"}</span>
                  </div>
                  <ZoneChips
                    all={Array.from({ length: 24 }, (_, i) => i + 1)}
                    active={plant.sunsetZones}
                    label="Sunset Zones (San Diego County ≈ 18–24)"
                  />
                </div>
                <div className="rounded-lg bg-gray-50 p-2 text-[11px] text-gray-400">
                  Reference bands used above: USDA {SD_USDA_ZONES.join("–")}, Sunset {SD_SUNSET_ZONES.join(", ")}.
                  High-elevation east-county sites (Julian, Mt. Laguna) fall outside this default band.
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
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
