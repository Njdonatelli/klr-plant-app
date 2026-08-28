import type { Plant, SDSuitability } from "../types";
import { NON_PLANT_CATEGORIES } from "../types";
import { LIGHT_BANDS, WATER_BANDS, lightBandLabel, waterBandLabel } from "./careTips";
import { sdSuitability } from "./sanDiego";

const M_TO_FT = 3.28084;

export function isLivingPlant(p: Plant): boolean {
  return !NON_PLANT_CATEGORIES.has(p.category);
}

/**
 * Membership tests below intentionally mirror the catalog's filter logic
 * (label string-includes for water/light, max-dimension boundaries for size)
 * so that clicking a chart element opens a catalog list with the same count.
 */

export function matchesWaterBand(p: Plant, band: string): boolean {
  const label = waterBandLabel(p);
  return label != null && label.includes(band);
}

export function matchesLightBand(p: Plant, band: string): boolean {
  const label = lightBandLabel(p);
  return label != null && label.includes(band);
}

export interface MatrixCell {
  water: string;
  light: string;
  count: number;
}

export interface WaterLightMatrix {
  waterBands: string[];
  lightBands: string[];
  /** rows in waterBands order, columns in lightBands order */
  cells: MatrixCell[][];
  maxCount: number;
}

export function waterLightMatrix(plants: Plant[]): WaterLightMatrix {
  const waterBands = WATER_BANDS.map((b) => b.label);
  const lightBands = LIGHT_BANDS.map((b) => b.label);
  const labels = plants.map((p) => ({
    water: waterBandLabel(p),
    light: lightBandLabel(p),
  }));
  let maxCount = 0;
  const cells = waterBands.map((water) =>
    lightBands.map((light) => {
      const count = labels.filter(
        (l) => l.water != null && l.water.includes(water) && l.light != null && l.light.includes(light)
      ).length;
      maxCount = Math.max(maxCount, count);
      return { water, light, count };
    })
  );
  return { waterBands, lightBands, cells, maxCount };
}

export interface HeightClass {
  label: string;
  range: string;
  minFt: number;
  maxFt: number | null;
}

/** Landscape-design height roles, classified by mature (max) height. */
export const HEIGHT_CLASSES: HeightClass[] = [
  { label: "Groundcover", range: "under 1 ft", minFt: 0, maxFt: 1 },
  { label: "Border & accent", range: "1–3 ft", minFt: 1, maxFt: 3 },
  { label: "Shrub", range: "3–6 ft", minFt: 3, maxFt: 6 },
  { label: "Screen / small tree", range: "6–15 ft", minFt: 6, maxFt: 15 },
  { label: "Medium tree", range: "15–30 ft", minFt: 15, maxFt: 30 },
  { label: "Large tree", range: "30 ft and up", minFt: 30, maxFt: null },
];

export function matureHeightFt(p: Plant): number | null {
  const m = p.heightMaxM ?? p.heightMinM;
  return m == null ? null : m * M_TO_FT;
}

export function heightClassCounts(plants: Plant[]): { cls: HeightClass; count: number }[] {
  return HEIGHT_CLASSES.map((cls) => ({
    cls,
    count: plants.filter((p) => {
      const ft = matureHeightFt(p);
      if (ft == null) return false;
      if (ft < cls.minFt) return false;
      if (cls.maxFt != null && ft >= cls.maxFt) return false;
      return true;
    }).length,
  }));
}

export function categoryCounts(plants: Plant[]): { category: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of plants) {
    if (!p.category) continue;
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export function suitabilityCounts(plants: Plant[]): Record<SDSuitability, number> {
  const out: Record<SDSuitability, number> = { suited: 0, marginal: 0, unknown: 0 };
  for (const p of plants) out[sdSuitability(p)]++;
  return out;
}

export function isCaNative(p: Plant): boolean {
  return p.caNative === "Yes" || p.caNative === "Y";
}
