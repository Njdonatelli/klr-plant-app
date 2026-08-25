import { get, set, del } from "idb-keyval";
import type { PlantDataset } from "../types";

const DATASET_KEY = "klr-plant-dataset-v1";
const SELECTION_KEY = "klr-plant-selection-v1";

export async function loadStoredDataset(): Promise<PlantDataset | null> {
  try {
    const val = await get(DATASET_KEY);
    return (val as PlantDataset) ?? null;
  } catch (e) {
    console.error("Failed to load dataset from IndexedDB", e);
    return null;
  }
}

export async function saveStoredDataset(dataset: PlantDataset): Promise<void> {
  await set(DATASET_KEY, dataset);
}

export async function clearStoredDataset(): Promise<void> {
  await del(DATASET_KEY);
}

export function loadSelection(): string[] {
  try {
    const raw = localStorage.getItem(SELECTION_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveSelection(ids: string[]): void {
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error("Failed to persist selection", e);
  }
}
