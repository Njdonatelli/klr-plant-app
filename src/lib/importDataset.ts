import * as XLSX from "xlsx";
import type { Plant } from "../types";

function slugCategory(raw: string): string {
  return raw
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toBool(v: unknown): boolean {
  if (v === true) return true;
  if (v == null || v === "") return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Case/whitespace-insensitive header lookup across a row of arbitrary column names. */
function pick(row: Record<string, unknown>, ...candidates: string[]): unknown {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const hit = keys.find((k) => k.trim().toLowerCase() === cand.toLowerCase());
    if (hit) return row[hit];
  }
  return undefined;
}

async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: "array" });
}

let importCounter = 0;
function nextId(): string {
  importCounter += 1;
  return `import-${Date.now()}-${importCounter}`;
}

/**
 * Flexible upsert import: works against a simple template (Common Name,
 * Botanical Name, Category, Water Needs Min/Max (in/wk), Light Hours
 * Min/Max, Mature Height/Width Min/Max (m), USDA Zone list, Sunset Zone
 * list, Source URL) OR against a full re-export of the "All Plants" master
 * sheet (same headers as the original catalog, including the one-hot
 * USDA Zn / Sunset Zn boolean columns). Missing columns are simply left
 * blank on the resulting record rather than rejected.
 */
export async function parseUploadedCatalog(file: File): Promise<Partial<Plant>[]> {
  const wb = await readWorkbook(file);
  const sheetName =
    wb.SheetNames.find((n) => n.trim().toLowerCase() === "all plants") ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

  return rows
    .map((row): Partial<Plant> | null => {
      const commonName = str(pick(row, "Common Name", "common name", "name"));
      const botanicalName = str(pick(row, "Botanical Name", "botanical name", "scientific name"));
      if (!commonName && !botanicalName) return null;

      const categoryRaw = pick(row, "Category", "category");
      const category = categoryRaw ? slugCategory(String(categoryRaw)) : "";

      // one-hot USDA/Sunset columns, if present (full master re-export)
      const usdaZones: number[] = [];
      for (let i = 1; i <= 13; i++) {
        if (toBool(pick(row, `USDA Z${i}`))) usdaZones.push(i);
      }
      const sunsetZones: number[] = [];
      for (let i = 1; i <= 24; i++) {
        if (toBool(pick(row, `Sunset Z${i}`))) sunsetZones.push(i);
      }
      const sunsetSpecial: string[] = [];
      for (const s of ["A1", "A2", "A3", "H1", "H2"]) {
        if (toBool(pick(row, `Sunset ${s}`))) sunsetSpecial.push(s);
      }

      // simple-template zone lists, e.g. "9, 10" or "18-24"
      const usdaListRaw = str(pick(row, "USDA Zones", "USDA Zone List"));
      if (usdaListRaw) expandZoneList(usdaListRaw).forEach((z) => {
        if (!usdaZones.includes(z)) usdaZones.push(z);
      });
      const sunsetListRaw = str(pick(row, "Sunset Zones", "Sunset Zone List"));
      if (sunsetListRaw) expandZoneList(sunsetListRaw).forEach((z) => {
        if (!sunsetZones.includes(z)) sunsetZones.push(z);
      });

      const heightMinM = toNum(pick(row, "Mature Height Min (m)", "Height Min (m)", "Height Min (ft)"));
      const heightMaxM = toNum(pick(row, "Mature Height Max (m)", "Height Max (m)", "Height Max (ft)"));
      const widthMinM = toNum(pick(row, "Mature Width Min (m)", "Width Min (m)", "Width Min (ft)"));
      const widthMaxM = toNum(pick(row, "Mature Width Max (m)", "Width Max (m)", "Width Max (ft)"));

      const rec: Partial<Plant> = {
        commonName: commonName ?? "(unnamed)",
        botanicalName: botanicalName ?? "",
        category,
        usdaZoneText: str(pick(row, "USDA Zone", "USDA Zone Text")) ?? (usdaZones.length ? summarizeZones(usdaZones) : null),
        usdaZones,
        sunsetZoneText: str(pick(row, "Sunset Zone", "Sunset Zone Text")) ?? (sunsetZones.length ? summarizeZones(sunsetZones) : null),
        sunsetZones,
        sunsetSpecial,
        heightText: str(pick(row, "Mature Height (m)", "Mature Height")),
        heightMinM,
        heightMaxM,
        widthText: str(pick(row, "Mature Width (m)", "Mature Width")),
        widthMinM,
        widthMaxM,
        lightText: str(pick(row, "Light Needs (hrs)", "Light Needs")),
        lightMinHrs: toNum(pick(row, "Light Hours Min", "Light Min (hrs)")),
        lightMaxHrs: toNum(pick(row, "Light Hours Max", "Light Max (hrs)")),
        waterText: str(pick(row, "Water Needs (in/wk)", "Water Needs")),
        waterMinInWk: toNum(pick(row, "Water Needs Min (in/wk)", "Water Min (in/wk)")),
        waterMaxInWk: toNum(pick(row, "Water Needs Max (in/wk)", "Water Max (in/wk)")),
        sourceUrl: str(pick(row, "Source URL", "Source")),
        caNative: str(pick(row, "CA Native", "California Native")),
        wucols: str(pick(row, "WUCOLS Code", "WUCOLS")),
        supplementalNotes: str(pick(row, "Notes", "Notes / Notable Uses")),
        imageUrl: str(pick(row, "Image URL", "Image")),
        id: nextId(),
        isCustom: true,
        updatedAt: new Date().toISOString(),
      };
      return rec;
    })
    .filter((r): r is Partial<Plant> => r !== null);
}

export function expandZoneList(raw: string): number[] {
  const out: number[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const a = parseInt(rangeMatch[1], 10);
      const b = parseInt(rangeMatch[2], 10);
      for (let z = Math.min(a, b); z <= Math.max(a, b); z++) out.push(z);
    } else {
      const n = parseInt(trimmed, 10);
      if (Number.isFinite(n)) out.push(n);
    }
  }
  return out;
}

function summarizeZones(zones: number[]): string {
  if (zones.length === 0) return "";
  const sorted = [...zones].sort((a, b) => a - b);
  return sorted.length > 1 ? `${sorted[0]} - ${sorted[sorted.length - 1]}` : `${sorted[0]}`;
}

function normalizeBotanicalKey(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’‘'"“”]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Merge imported rows into the current dataset. A row upserts by
 * botanical-name match (case/punctuation-insensitive); rows with no
 * botanical name match fall back to an exact common-name match; anything
 * left over is added as a new record.
 */
export function mergeImportedPlants(existing: Plant[], imported: Partial<Plant>[]): {
  merged: Plant[];
  added: number;
  updated: number;
} {
  const byBotanical = new Map<string, number>();
  const byCommon = new Map<string, number>();
  existing.forEach((p, idx) => {
    if (p.botanicalName) byBotanical.set(normalizeBotanicalKey(p.botanicalName), idx);
    byCommon.set(p.commonName.trim().toLowerCase(), idx);
  });

  const merged = [...existing];
  let added = 0;
  let updated = 0;

  for (const row of imported) {
    let matchIdx: number | undefined;
    if (row.botanicalName) matchIdx = byBotanical.get(normalizeBotanicalKey(row.botanicalName));
    if (matchIdx === undefined && row.commonName) {
      matchIdx = byCommon.get(row.commonName.trim().toLowerCase());
    }
    if (matchIdx !== undefined) {
      const current = merged[matchIdx];
      merged[matchIdx] = {
        ...current,
        ...row,
        id: current.id,
        imageUrl: row.imageUrl ?? current.imageUrl,
      } as Plant;
      updated += 1;
    } else {
      merged.push(row as Plant);
      added += 1;
    }
  }

  return { merged, added, updated };
}
