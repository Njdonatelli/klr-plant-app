import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Printer, FileDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { useStore } from "../store/useStore";
import { CATEGORY_LABELS, NON_PLANT_CATEGORIES } from "../types";
import ImagePlaceholder from "./ImagePlaceholder";
import Gauge from "./Gauge";
import SizeChart from "./SizeChart";
import ZoneBadge from "./ZoneBadge";
import { generateCareNotes, lightBandLabel, waterBandLabel } from "../lib/careTips";
import { exportCareDocumentDocx } from "../lib/exportDocx";

export default function CareDocument() {
  const plants = useStore((s) => s.plants);
  const selectedIds = useStore((s) => s.selectedIds);
  const toggleSelected = useStore((s) => s.toggleSelected);

  const [order, setOrder] = useState<string[] | null>(null);
  const [meta, setMeta] = useState({ clientName: "", propertyAddress: "", preparedBy: "KLR Build Teams", date: new Date().toLocaleDateString() });
  const [exporting, setExporting] = useState(false);

  const selectedPlants = useMemo(() => {
    const base = plants.filter((p) => selectedIds.has(p.id));
    if (!order) return base;
    const byId = new Map(base.map((p) => [p.id, p]));
    const ordered = order.map((id) => byId.get(id)).filter(Boolean) as typeof base;
    // include anything newly selected that isn't in `order` yet
    const missing = base.filter((p) => !order.includes(p.id));
    return [...ordered, ...missing];
  }, [plants, selectedIds, order]);

  function move(id: string, dir: -1 | 1) {
    const current = order ?? selectedPlants.map((p) => p.id);
    const idx = current.indexOf(id);
    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= current.length) return;
    const next = [...current];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    setOrder(next);
  }

  async function handleExportDocx() {
    setExporting(true);
    try {
      await exportCareDocumentDocx(selectedPlants, meta);
    } finally {
      setExporting(false);
    }
  }

  if (selectedPlants.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-gray-500">No plants selected yet.</p>
        <Link to="/" className="mt-4 inline-block text-klr-700 underline">
          Browse the catalog to add some
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <Link to="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" /> Back to catalog
        </Link>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
          <button
            onClick={handleExportDocx}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg bg-klr-600 px-4 py-2 text-sm font-medium text-white hover:bg-klr-700 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" /> {exporting ? "Building…" : "Export Word (.docx)"}
          </button>
        </div>
      </div>

      <div className="no-print mb-6 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <input
          className="input"
          placeholder="Client name"
          value={meta.clientName}
          onChange={(e) => setMeta((m) => ({ ...m, clientName: e.target.value }))}
        />
        <input
          className="input"
          placeholder="Property address"
          value={meta.propertyAddress}
          onChange={(e) => setMeta((m) => ({ ...m, propertyAddress: e.target.value }))}
        />
        <input
          className="input"
          placeholder="Prepared by"
          value={meta.preparedBy}
          onChange={(e) => setMeta((m) => ({ ...m, preparedBy: e.target.value }))}
        />
        <input className="input" placeholder="Date" value={meta.date} onChange={(e) => setMeta((m) => ({ ...m, date: e.target.value }))} />
      </div>

      <div id="print-root">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Plant Care Guide</h1>
          <p className="mt-1 text-sm text-gray-500">Prepared by {meta.preparedBy || "KLR Build Teams"}</p>
          {(meta.clientName || meta.propertyAddress || meta.date) && (
            <div className="mx-auto mt-4 max-w-md rounded-lg border border-gray-200 p-3 text-left text-sm text-gray-600">
              {meta.clientName && <div><span className="font-medium text-gray-800">Client:</span> {meta.clientName}</div>}
              {meta.propertyAddress && <div><span className="font-medium text-gray-800">Property:</span> {meta.propertyAddress}</div>}
              {meta.date && <div><span className="font-medium text-gray-800">Date:</span> {meta.date}</div>}
            </div>
          )}
        </div>

        <div className="space-y-8">
          {selectedPlants.map((plant, i) => {
            const isMaterial = NON_PLANT_CATEGORIES.has(plant.category);
            return (
              <div key={plant.id} className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${i > 0 ? "print-break" : ""}`}>
                <div className="no-print mb-3 flex items-center gap-2">
                  <button onClick={() => move(plant.id, -1)} className="rounded border border-gray-200 p-1 text-gray-400 hover:text-gray-700">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => move(plant.id, 1)} className="rounded border border-gray-200 p-1 text-gray-400 hover:text-gray-700">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleSelected(plant.id)}
                    className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" /> remove from document
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div className="aspect-square overflow-hidden rounded-lg border border-gray-200">
                    <ImagePlaceholder category={plant.category} imageUrl={plant.imageUrl} />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-klr-600">
                      {CATEGORY_LABELS[plant.category] ?? plant.category}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{plant.commonName}</h2>
                    <p className="italic text-gray-500">{plant.botanicalName || "—"}</p>
                    {!isMaterial && (
                      <div className="mt-2">
                        <ZoneBadge plant={plant} />
                      </div>
                    )}
                  </div>
                </div>

                {isMaterial ? (
                  <p className="mt-4 text-sm italic text-gray-500">
                    Material / hardgood item -- included as a line item; no plant care requirements apply.
                  </p>
                ) : (
                  <>
                    <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="space-y-4">
                        <Gauge label="Light" min={plant.lightMinHrs} max={plant.lightMaxHrs} scaleMax={8} unit="hrs/day" bandLabel={lightBandLabel(plant)} colorClass="bg-amber-400" />
                        <Gauge label="Water" min={plant.waterMinInWk} max={plant.waterMaxInWk} scaleMax={2} unit="in/wk" bandLabel={waterBandLabel(plant)} colorClass="bg-sky-500" />
                      </div>
                      <SizeChart heightMinM={plant.heightMinM} heightMaxM={plant.heightMaxM} widthMinM={plant.widthMinM} widthMaxM={plant.widthMaxM} />
                    </div>
                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Care Notes</h3>
                      <ul className="space-y-1.5 text-sm text-gray-700">
                        {generateCareNotes(plant).map((n, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-klr-500" />
                            {n}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
