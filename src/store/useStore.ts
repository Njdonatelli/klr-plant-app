import { create } from "zustand";
import type { Plant, PlantDataset } from "../types";
import { loadStoredDataset, saveStoredDataset, loadSelection, saveSelection } from "../lib/storage";
import { mergeImportedPlants } from "../lib/importDataset";
import basePlants from "../data/plants.base.json";

interface ImportResult {
  added: number;
  updated: number;
}

interface StoreState {
  plants: Plant[];
  datasetVersion: number;
  datasetUpdatedAt: string;
  isLoaded: boolean;
  selectedIds: Set<string>;

  init: () => Promise<void>;
  toggleSelected: (id: string) => void;
  isSelected: (id: string) => boolean;
  clearSelection: () => void;
  selectMany: (ids: string[]) => void;

  upsertPlant: (plant: Plant) => Promise<void>;
  deletePlant: (id: string) => Promise<void>;
  importPlants: (rows: Partial<Plant>[]) => Promise<ImportResult>;
  replaceDataset: (rows: Partial<Plant>[]) => Promise<void>;
  resetToOriginal: () => Promise<void>;
}

const BASE_PLANTS = basePlants as unknown as Plant[];

function makeDataset(plants: Plant[]): PlantDataset {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    source: "KLR master catalog",
    plants,
  };
}

async function persist(plants: Plant[]) {
  await saveStoredDataset(makeDataset(plants));
}

export const useStore = create<StoreState>((set, get) => ({
  plants: BASE_PLANTS,
  datasetVersion: 0,
  datasetUpdatedAt: "",
  isLoaded: false,
  selectedIds: new Set(),

  init: async () => {
    const stored = await loadStoredDataset();
    const selection = loadSelection();
    if (stored && stored.plants.length > 0) {
      set({
        plants: stored.plants,
        datasetVersion: stored.version,
        datasetUpdatedAt: stored.updatedAt,
        selectedIds: new Set(selection),
        isLoaded: true,
      });
    } else {
      await persist(BASE_PLANTS);
      set({
        plants: BASE_PLANTS,
        datasetVersion: 1,
        datasetUpdatedAt: new Date().toISOString(),
        selectedIds: new Set(selection),
        isLoaded: true,
      });
    }
  },

  toggleSelected: (id) => {
    const next = new Set(get().selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    saveSelection([...next]);
    set({ selectedIds: next });
  },

  isSelected: (id) => get().selectedIds.has(id),

  clearSelection: () => {
    saveSelection([]);
    set({ selectedIds: new Set() });
  },

  selectMany: (ids) => {
    const next = new Set(get().selectedIds);
    ids.forEach((id) => next.add(id));
    saveSelection([...next]);
    set({ selectedIds: next });
  },

  upsertPlant: async (plant) => {
    const current = get().plants;
    const idx = current.findIndex((p) => p.id === plant.id);
    let next: Plant[];
    if (idx >= 0) {
      next = [...current];
      next[idx] = { ...plant, updatedAt: new Date().toISOString() };
    } else {
      next = [...current, { ...plant, updatedAt: new Date().toISOString(), isCustom: true }];
    }
    await persist(next);
    set({ plants: next, datasetUpdatedAt: new Date().toISOString() });
  },

  deletePlant: async (id) => {
    const next = get().plants.filter((p) => p.id !== id);
    await persist(next);
    const nextSel = new Set(get().selectedIds);
    nextSel.delete(id);
    saveSelection([...nextSel]);
    set({ plants: next, selectedIds: nextSel, datasetUpdatedAt: new Date().toISOString() });
  },

  importPlants: async (rows) => {
    const current = get().plants;
    const { merged, added, updated } = mergeImportedPlants(current, rows);
    await persist(merged);
    set({ plants: merged, datasetUpdatedAt: new Date().toISOString() });
    return { added, updated };
  },

  replaceDataset: async (rows) => {
    const full = rows.map((r, i) => ({
      id: r.id ?? `replace-${i}`,
      commonName: r.commonName ?? "(unnamed)",
      botanicalName: r.botanicalName ?? "",
      category: r.category ?? "",
      usdaZoneText: r.usdaZoneText ?? null,
      usdaZones: r.usdaZones ?? [],
      sunsetZoneText: r.sunsetZoneText ?? null,
      sunsetZones: r.sunsetZones ?? [],
      sunsetSpecial: r.sunsetSpecial ?? [],
      heightText: r.heightText ?? null,
      heightMinM: r.heightMinM ?? null,
      heightMaxM: r.heightMaxM ?? null,
      widthText: r.widthText ?? null,
      widthMinM: r.widthMinM ?? null,
      widthMaxM: r.widthMaxM ?? null,
      lightText: r.lightText ?? null,
      lightMinHrs: r.lightMinHrs ?? null,
      lightMaxHrs: r.lightMaxHrs ?? null,
      waterText: r.waterText ?? null,
      waterMinInWk: r.waterMinInWk ?? null,
      waterMaxInWk: r.waterMaxInWk ?? null,
      sourceUrl: r.sourceUrl ?? null,
      caNative: r.caNative ?? null,
      wucols: r.wucols ?? null,
      supplementalNotes: r.supplementalNotes ?? null,
      imageUrl: r.imageUrl ?? null,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    })) as Plant[];
    await persist(full);
    set({ plants: full, selectedIds: new Set(), datasetUpdatedAt: new Date().toISOString() });
    saveSelection([]);
  },

  resetToOriginal: async () => {
    await persist(BASE_PLANTS);
    set({ plants: BASE_PLANTS, selectedIds: new Set(), datasetUpdatedAt: new Date().toISOString() });
    saveSelection([]);
  },
}));
