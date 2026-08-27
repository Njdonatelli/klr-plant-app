import { useRef, useState } from "react";
import { Upload, Plus, RotateCcw, Download, Pencil, Trash2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { parseUploadedCatalog } from "../lib/importDataset";
import { CATEGORY_LABELS } from "../types";
import PlantForm from "./PlantForm";
import type { Plant } from "../types";

const TEMPLATE_CSV = `Common Name,Botanical Name,Category,Light Hours Min,Light Hours Max,Water Needs Min (in/wk),Water Needs Max (in/wk),Mature Height Min (m),Mature Height Max (m),Mature Width Min (m),Mature Width Max (m),USDA Zones,Sunset Zones,CA Native,WUCOLS Code,Source URL,Notes
Example Sage,Salvia example,evergreen-shrubs,6,8,0,0.5,0.6,1.2,0.9,1.5,"9, 10","18-24",Yes,VL,https://example.com,Drought tolerant once established
`;

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "klr-plant-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function DatasetManager() {
  const plants = useStore((s) => s.plants);
  const importPlants = useStore((s) => s.importPlants);
  const resetToOriginal = useStore((s) => s.resetToOriginal);
  const deletePlant = useStore((s) => s.deletePlant);
  const datasetUpdatedAt = useStore((s) => s.datasetUpdatedAt);

  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formTarget, setFormTarget] = useState<Plant | "new" | null>(null);
  const [query, setQuery] = useState("");

  async function handleFile(file: File) {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      setStatus("File is too large (max 10 MB). Please reduce the file size and try again.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const rows = await parseUploadedCatalog(file);
      if (rows.length === 0) {
        setStatus("No usable rows found in that file -- check the column headers against the template.");
        return;
      }
      const { added, updated } = await importPlants(rows);
      setStatus(`Import complete: ${added} plant${added === 1 ? "" : "s"} added, ${updated} updated.`);
    } catch (e) {
      console.error(e);
      setStatus("Could not read that file. Make sure it's a .xlsx or .csv export.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const customPlants = plants.filter((p) => p.isCustom);
  const filteredCustom = customPlants.filter((p) =>
    `${p.commonName} ${p.botanicalName}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">Manage Dataset</h1>
      <p className="mt-1 text-sm text-gray-500">
        {plants.length.toLocaleString()} items in the catalog
        {datasetUpdatedAt && ` · last updated ${new Date(datasetUpdatedAt).toLocaleString()}`}.
        Changes are saved in this browser automatically.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Upload className="h-4 w-4" /> Bulk import / update
          </h2>
          <p className="mb-3 text-sm text-gray-500">
            Upload a .xlsx or .csv file to add new plants or update existing ones. Rows are matched by botanical
            name (falling back to common name) -- matches update the existing record, everything else is added as
            new. You can re-upload the original master workbook's "All Plants" sheet, or use the simple template
            below for incremental updates.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="rounded-lg bg-klr-600 px-4 py-2 text-sm font-medium text-white hover:bg-klr-700 disabled:opacity-50"
            >
              {busy ? "Importing…" : "Choose file to import"}
            </button>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" /> Download CSV template
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {status && <p className="mt-3 text-sm text-klr-700">{status}</p>}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Plus className="h-4 w-4" /> Add a single plant
          </h2>
          <p className="mb-3 text-sm text-gray-500">
            Add one-off plants manually -- useful for a variety not yet in the master catalog, or to record a
            client-specific substitution.
          </p>
          <button
            onClick={() => setFormTarget("new")}
            className="rounded-lg border border-klr-600 px-4 py-2 text-sm font-medium text-klr-700 hover:bg-klr-50"
          >
            + Add Plant
          </button>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <RotateCcw className="h-4 w-4" /> Reset dataset
            </h3>
            <p className="mb-3 text-sm text-gray-500">
              Discard all manual edits/imports in this browser and revert to the original master catalog.
            </p>
            <button
              onClick={() => {
                if (confirm("Reset the dataset to the original master catalog? All manual edits and imports in this browser will be lost.")) {
                  resetToOriginal();
                }
              }}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Reset to original catalog
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-800">
            Manually added / edited items ({customPlants.length})
          </h2>
          <input
            className="input max-w-xs"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {filteredCustom.length === 0 ? (
          <p className="text-sm text-gray-400">No manual edits yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3">Common Name</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Updated</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustom.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2 pr-3 font-medium text-gray-800">{p.commonName}</td>
                    <td className="py-2 pr-3 text-gray-500">{CATEGORY_LABELS[p.category] ?? p.category}</td>
                    <td className="py-2 pr-3 text-gray-400">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setFormTarget(p)} className="text-gray-400 hover:text-klr-700">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => confirm(`Remove "${p.commonName}"?`) && deletePlant(p.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formTarget && (
        <PlantForm plant={formTarget === "new" ? undefined : formTarget} onClose={() => setFormTarget(null)} />
      )}
    </div>
  );
}
