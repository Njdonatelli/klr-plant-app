export interface Plant {
  id: string;
  commonName: string;
  botanicalName: string;
  category: string;

  usdaZoneText: string | null;
  usdaZones: number[];
  sunsetZoneText: string | null;
  sunsetZones: number[];
  sunsetSpecial: string[]; // A1-A3, H1-H2

  heightText: string | null;
  heightMinM: number | null;
  heightMaxM: number | null;
  widthText: string | null;
  widthMinM: number | null;
  widthMaxM: number | null;

  lightText: string | null;
  lightMinHrs: number | null;
  lightMaxHrs: number | null;

  waterText: string | null;
  waterMinInWk: number | null;
  waterMaxInWk: number | null;

  sourceUrl: string | null;
  caNative: string | null;
  wucols: string | null;
  supplementalNotes: string | null;

  imageUrl: string | null;
  description?: string | null;

  // bookkeeping for user-managed data
  isCustom?: boolean;
  updatedAt?: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  "annuals-bulbs": "Annuals & Bulbs",
  "bamboo": "Bamboo",
  "bulk-soils-mulches": "Bulk Soils & Mulches",
  "cactus-succulents": "Cactus & Succulents",
  "camellias-azaleas-rhododendrons": "Camellias, Azaleas & Rhododendrons",
  "citrus-avocado": "Citrus & Avocado",
  "conifers": "Conifers",
  "deciduous-shrubs": "Deciduous Shrubs",
  "deciduous-trees": "Deciduous Trees",
  "dry-goods": "Dry Goods",
  "edibles-fruit-vegetables": "Edibles: Fruit & Vegetables",
  "evergreen-shrubs": "Evergreen Shrubs",
  "evergreen-trees": "Evergreen Trees",
  "ferns": "Ferns",
  "grasses-grass-like-plants": "Grasses & Grass-like Plants",
  "palms": "Palms",
  "perennials-groundcovers": "Perennials & Groundcovers",
  "roses": "Roses",
  "sod": "Sod",
  "strappy-leaf-perennials": "Strappy-leaf Perennials",
  "tropicals": "Tropicals",
  "vines": "Vines",
};

// Categories that are materials/hardgoods, not living plants -- no care
// dashboard applies. Flagged so the UI can suppress plant-care sections
// rather than fabricate horticultural data for a bag of mulch.
export const NON_PLANT_CATEGORIES = new Set([
  "bulk-soils-mulches",
  "dry-goods",
  "sod",
]);

export type SDSuitability = "suited" | "marginal" | "unknown";

export interface PlantDataset {
  version: number;
  /** Which shipped plants.base.json generation this dataset was last synced to. */
  baseVersion?: number;
  updatedAt: string;
  source: string;
  plants: Plant[];
}
