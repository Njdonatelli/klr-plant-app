import type { Plant, PlantDataset } from "../types";

/**
 * Bump this whenever src/data/plants.base.json ships corrected data. On next
 * load, stored datasets stamped with an older baseVersion get their untouched
 * baseline records refreshed in place -- without disturbing anything the user
 * added, edited, or deleted. (v2: zone text/array reconciliation + USDA/Sunset
 * field un-swap, Aug 2026. v3: sunsetZoneText separator typos salvaged from
 * the archived db-quality branch.)
 */
export const BASE_DATASET_VERSION = 3;

/** A record the user has added or edited; migration must never replace these. */
function isTouched(p: Plant): boolean {
  return Boolean(p.isCustom || p.updatedAt);
}

/**
 * Refresh untouched baseline records in a stored dataset to match the
 * currently shipped baseline. Returns null when the dataset is already on the
 * current baseline; otherwise the migrated plant list plus a count of
 * refreshed records (the caller should persist with the new baseVersion
 * stamp even when refreshed is 0, so the check doesn't rerun every load).
 *
 * Two cases:
 *  - Stored data shares ids with the shipped baseline: replace each untouched
 *    baseline record in place. User deletions stay deleted (missing ids are
 *    not re-added), edits and custom records are kept verbatim.
 *  - Stored data predates the current id scheme entirely (an older catalog
 *    generation): the untouched old records ARE the old baseline, so swap
 *    them for the new baseline wholesale, keeping the user's touched records.
 *    If every record is touched (e.g. a deliberate full dataset replacement),
 *    change nothing.
 */
export function migrateBaseline(
  stored: PlantDataset,
  basePlants: Plant[]
): { plants: Plant[]; refreshed: number } | null {
  if ((stored.baseVersion ?? 1) >= BASE_DATASET_VERSION) return null;

  const baseById = new Map(basePlants.map((p) => [p.id, p]));
  const sameGeneration = stored.plants.some((p) => baseById.has(p.id));

  if (sameGeneration) {
    let refreshed = 0;
    const plants = stored.plants.map((p) => {
      const base = baseById.get(p.id);
      if (base && !isTouched(p)) {
        refreshed += 1;
        return base;
      }
      return p;
    });
    return { plants, refreshed };
  }

  const touched = stored.plants.filter(isTouched);
  if (touched.length === stored.plants.length) {
    // Nothing untouched to refresh -- user replaced the whole dataset.
    return { plants: stored.plants, refreshed: 0 };
  }
  return { plants: [...basePlants, ...touched], refreshed: basePlants.length };
}
