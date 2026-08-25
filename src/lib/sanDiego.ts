import type { Plant, SDSuitability } from "../types";

/**
 * San Diego County spans a wide climate range -- immediate coast through
 * inland valleys to foothill/mountain communities. There is no single
 * "San Diego zone." These are the zone sets that cover the county's
 * populated design-build service area (coastal Oceanside/Carlsbad through
 * inland Escondido/El Cajon/Ramona-type climates):
 *
 *   USDA:   9b - 10b   (roughly zones 9, 10 in this dataset's integer bands)
 *   Sunset: 18-24       (interior valleys through immediate coast)
 *
 * High-elevation east-county communities (Julian, Mt. Laguna) fall in
 * colder Sunset zones (1-3) and are NOT covered by this default -- most
 * KLR project sites are not at that elevation. This assumption is encoded
 * in one place (below) so it can be edited if a project site sits outside
 * the coastal/inland-valley band.
 */
export const SD_USDA_ZONES = [9, 10];
export const SD_SUNSET_ZONES = [18, 19, 20, 21, 22, 23, 24];

export function hasAnyZoneData(p: Plant): boolean {
  return Boolean(
    (p.usdaZoneText && p.usdaZoneText.trim()) ||
      (p.sunsetZoneText && p.sunsetZoneText.trim()) ||
      p.usdaZones.length > 0 ||
      p.sunsetZones.length > 0
  );
}

export function sdSuitability(p: Plant): SDSuitability {
  if (!hasAnyZoneData(p)) return "unknown";
  const usdaHit = p.usdaZones.some((z) => SD_USDA_ZONES.includes(z));
  const sunsetHit = p.sunsetZones.some((z) => SD_SUNSET_ZONES.includes(z));
  if (usdaHit || sunsetHit) return "suited";
  return "marginal";
}

export const SD_SUITABILITY_LABEL: Record<SDSuitability, string> = {
  suited: "Suited to San Diego County",
  marginal: "Marginal / verify site conditions",
  unknown: "Zone data not available",
};

export const SD_SUITABILITY_COLOR: Record<SDSuitability, string> = {
  suited: "bg-emerald-100 text-emerald-800 border-emerald-300",
  marginal: "bg-amber-100 text-amber-800 border-amber-300",
  unknown: "bg-gray-100 text-gray-600 border-gray-300",
};
