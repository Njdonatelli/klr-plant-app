import { create, StateCreator } from "zustand";
import type { Plant, PlantDataset } from "../types";
import { loadStoredDataset, saveStoredDataset, loadSelection, saveSelection } from "../lib/storage";
import { mergeImportedPlants } from "../lib/importDataset";
import { migrateBaseline, BASE_DATASET_VERSION } from "../lib/baselineMigration";
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
  initError: boolean;
  persistError: string | null;
  selectedIds: Set<string>;

  init: () => Promise<void>;
  retryInit: () => Promise<void>;
  dismissPersistError: () => void;
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
    baseVersion: BASE_DATASET_VERSION,
    updatedAt: new Date().toISOString(),
    source: "KLR master catalog",
    plants,
  };
}

const STORAGE_ERROR_MSG =
  "Changes are visible but could not be saved — they may not appear after a reload. (Storage may be full or blocked in private browsing mode.)";

const createStore: StateCreator<StoreState> = (set, get) => {
  async function persist(plants: Plant[]) {
    try {
      await saveStoredDataset(makeDataset(plants));
    } catch (e) {
      console.error("Storage write failed", e);
      set({ persistError: STORAGE_ERROR_MSG });
    }
  }

  return {
    plants: BASE_PLANTS,
    datasetVersion: 0,
    datasetUpdatedAt: "",
    isLoaded: false,
    initError: false,
    persistError: null,
    selectedIds: new Set(),

    init: async () => {
      try {
        const stored = await loadStoredDataset();
        const selection = loadSelection();
        if (stored && stored.plants.length > 0) {
          // Refresh untouched baseline records when the shipped baseline has
          // corrections this browser hasn't seen (keeps user edits/deletes intact).
          const migrated = migrateBaseline(stored, BASE_PLANTS);
          const plants = migrated ? migrated.plants : stored.plants;
          if (migrated) {
            await persist(plants); // also stamps the new baseVersion
            if (migrated.refreshed > 0) {
              console.info(`Baseline update: refreshed ${migrated.refreshed} catalog records.`);
            }
          }
          set({
            plants,
            datasetVersion: stored.version,
            datasetUpdatedAt: migrated ? new Date().toISOString() : stored.updatedAt,
            selectedIds: new Set(selection),
            isLoaded: true,
            initError: false,
          });
        } else {
          set({
            plants: BASE_PLANTS,
            datasetVersion: 1,
            datasetUpdatedAt: new Date().toISOString(),
            selectedIds: new Set(selection),
            isLoaded: true,
            initError: false,
          });
          await persist(BASE_PLANTS);
        }
      } catch (e) {
        console.error("App init failed", e);
        set({ initError: true });
      }
    },

    retryInit: async () => {
      set({ initError: false });
      await get().init();
    },

    dismissPersistError: () => set({ persistError: null }),

    toggleSelected: (id: string) => {
      const next = new Set(get().selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      const ok = saveSelection([...next]);
      if (!ok) set({ persistError: STORAGE_ERROR_MSG });
      set({ selectedIds: next });
    },

    isSelected: (id: string) => get().selectedIds.has(id),

    clearSelection: () => {
      saveSelection([]);
      set({ selectedIds: new Set() });
    },

    selectMany: (ids: string[]) => {
      const next = new Set(get().selectedIds);
      ids.forEach((id) => next.add(id));
      const ok = saveSelection([...next]);
      if (!ok) set({ persistError: STORAGE_ERROR_MSG });
      set({ selectedIds: next });
    },

    upsertPlant: async (plant: Plant) => {
      const current = get().plants;
      const idx = current.findIndex((p) => p.id === plant.id);
      let next: Plant[];
      if (idx >= 0) {
        next = [...current];
        next[idx] = { ...plant, updatedAt: new Date().toISOString() };
      } else {
        next = [...current, { ...plant, updatedAt: new Date().toISOString(), isCustom: true }];
      }
      set({ plants: next, datasetUpdatedAt: new Date().toISOString() });
      await persist(next);
    },

    deletePlant: async (id: string) => {
      const next = get().plants.filter((p) => p.id !== id);
      const nextSel = new Set(get().selectedIds);
      nextSel.delete(id);
      saveSelection([...nextSel]);
      set({ plants: next, selectedIds: nextSel, datasetUpdatedAt: new Date().toISOString() });
      await persist(next);
    },

    importPlants: async (rows: Partial<Plant>[]) => {
      const current = get().plants;
      const { merged, added, updated } = mergeImportedPlants(current, rows);
      set({ plants: merged, datasetUpdatedAt: new Date().toISOString() });
      await persist(merged);
      return { added, updated };
    },

    replaceDataset: async (rows: Partial<Plant>[]) => {
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
      saveSelection([]);
      set({ plants: full, selectedIds: new Set(), datasetUpdatedAt: new Date().toISOString() });
      await persist(full);
    },

    resetToOriginal: async () => {
      saveSelection([]);
      set({ plants: BASE_PLANTS, selectedIds: new Set(), datasetUpdatedAt: new Date().toISOString() });
      await persist(BASE_PLANTS);
    },
  };
};

export const useStore = create<StoreState>(createStore);
