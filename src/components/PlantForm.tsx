import { useState } from "react";
import { X } from "lucide-react";
import type { Plant } from "../types";
import { CATEGORY_LABELS } from "../types";
import { useStore } from "../store/useStore";
import { expandZoneList } from "../lib/importDataset";

const FT_TO_M = 0.3048;

interface Props {
  plant?: Plant;
  onClose: () => void;
}

function emptyPlant(): Plant {
  return {
    id: `new-${Date.now()}`,
    commonName: "",
    botanicalName: "",
    category: "evergreen-shrubs",
    usdaZoneText: null,
    usdaZones: [],
    sunsetZoneText: null,
    sunsetZones: [],
    sunsetSpecial: [],
    heightText: null,
    heightMinM: null,
    heightMaxM: null,
    widthText: null,
    widthMinM: null,
    widthMaxM: null,
    lightText: null,
    lightMinHrs: null,
    lightMaxHrs: null,
    waterText: null,
    waterMinInWk: null,
    waterMaxInWk: null,
    sourceUrl: null,
    caNative: null,
    wucols: null,
    supplementalNotes: null,
    imageUrl: null,
    description: null,
    isCustom: true,
  };
}

function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export default function PlantForm({ plant, onClose }: Props) {
  const upsertPlant = useStore((s) => s.upsertPlant);
  const isNew = !plant;
  const [form, setForm] = useState<Plant>(plant ? { ...plant } : emptyPlant());
  const [heightFt, setHeightFt] = useState({
    min: plant?.heightMinM != null ? (plant.heightMinM / FT_TO_M).toFixed(1) : "",
    max: plant?.heightMaxM != null ? (plant.heightMaxM / FT_TO_M).toFixed(1) : "",
  });
  const [widthFt, setWidthFt] = useState({
    min: plant?.widthMinM != null ? (plant.widthMinM / FT_TO_M).toFixed(1) : "",
    max: plant?.widthMaxM != null ? (plant.widthMaxM / FT_TO_M).toFixed(1) : "",
  });
  const [usdaText, setUsdaText] = useState(plant?.usdaZones.join(", ") ?? "");
  const [sunsetText, setSunsetText] = useState(plant?.sunsetZones.join(", ") ?? "");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Plant>(key: K, value: Plant[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.commonName.trim()) {
      alert("Common name is required.");
      return;
    }
    setSaving(true);
    const usdaZones = expandZoneList(usdaText);
    const sunsetZones = expandZoneList(sunsetText);
    const hMin = num(heightFt.min);
    const hMax = num(heightFt.max);
    const wMin = num(widthFt.min);
    const wMax = num(widthFt.max);

    const final: Plant = {
      ...form,
      usdaZones,
      usdaZoneText: usdaZones.length ? usdaText : form.usdaZoneText,
      sunsetZones,
      sunsetZoneText: sunsetZones.length ? sunsetText : form.sunsetZoneText,
      heightMinM: hMin != null ? hMin * FT_TO_M : null,
      heightMaxM: hMax != null ? hMax * FT_TO_M : null,
      widthMinM: wMin != null ? wMin * FT_TO_M : null,
      widthMaxM: wMax != null ? wMax * FT_TO_M : null,
    };
    await upsertPlant(final);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{isNew ? "Add Plant" : "Edit Plant"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Common Name *">
            <input className="input" value={form.commonName} onChange={(e) => set("commonName", e.target.value)} />
          </Field>
          <Field label="Botanical Name">
            <input className="input" value={form.botanicalName} onChange={(e) => set("botanicalName", e.target.value)} />
          </Field>
          <Field label="Category">
            <select className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Image URL (optional)">
            <input className="input" value={form.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value || null)} placeholder="Leave blank to use placeholder" />
          </Field>

          <Field label="Light Hours Min">
            <input className="input" type="number" step="0.5" value={form.lightMinHrs ?? ""} onChange={(e) => set("lightMinHrs", num(e.target.value))} />
          </Field>
          <Field label="Light Hours Max">
            <input className="input" type="number" step="0.5" value={form.lightMaxHrs ?? ""} onChange={(e) => set("lightMaxHrs", num(e.target.value))} />
          </Field>

          <Field label="Water Needs Min (in/wk)">
            <input className="input" type="number" step="0.1" value={form.waterMinInWk ?? ""} onChange={(e) => set("waterMinInWk", num(e.target.value))} />
          </Field>
          <Field label="Water Needs Max (in/wk)">
            <input className="input" type="number" step="0.1" value={form.waterMaxInWk ?? ""} onChange={(e) => set("waterMaxInWk", num(e.target.value))} />
          </Field>

          <Field label="Mature Height Min/Max (ft)">
            <div className="flex gap-2">
              <input className="input" type="number" step="0.5" value={heightFt.min} onChange={(e) => setHeightFt((s) => ({ ...s, min: e.target.value }))} placeholder="min" />
              <input className="input" type="number" step="0.5" value={heightFt.max} onChange={(e) => setHeightFt((s) => ({ ...s, max: e.target.value }))} placeholder="max" />
            </div>
          </Field>
          <Field label="Mature Width Min/Max (ft)">
            <div className="flex gap-2">
              <input className="input" type="number" step="0.5" value={widthFt.min} onChange={(e) => setWidthFt((s) => ({ ...s, min: e.target.value }))} placeholder="min" />
              <input className="input" type="number" step="0.5" value={widthFt.max} onChange={(e) => setWidthFt((s) => ({ ...s, max: e.target.value }))} placeholder="max" />
            </div>
          </Field>

          <Field label="USDA Zones (e.g. 9, 10)">
            <input className="input" value={usdaText} onChange={(e) => setUsdaText(e.target.value)} />
          </Field>
          <Field label="Sunset Zones (e.g. 18-24)">
            <input className="input" value={sunsetText} onChange={(e) => setSunsetText(e.target.value)} />
          </Field>

          <Field label="CA Native (Yes/No)">
            <input className="input" value={form.caNative ?? ""} onChange={(e) => set("caNative", e.target.value || null)} />
          </Field>
          <Field label="WUCOLS Code">
            <input className="input" value={form.wucols ?? ""} onChange={(e) => set("wucols", e.target.value || null)} />
          </Field>

          <Field label="Source URL" full>
            <input className="input" value={form.sourceUrl ?? ""} onChange={(e) => set("sourceUrl", e.target.value || null)} />
          </Field>
          <Field label="Description" full>
            <textarea className="input" rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value || null)} />
          </Field>
          <Field label="Notes" full>
            <textarea className="input" rows={3} value={form.supplementalNotes ?? ""} onChange={(e) => set("supplementalNotes", e.target.value || null)} />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-klr-600 px-4 py-2 text-sm font-medium text-white hover:bg-klr-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${full ? "sm:col-span-2" : ""}`}>
      <span className="font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
