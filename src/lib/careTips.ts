import type { Plant } from "../types";

/**
 * These are general, widely-published horticultural rules of thumb (not
 * sourced from this plant's specific record) used to turn the dataset's
 * numeric light/water bands into homeowner-readable guidance. They are a
 * starting draft for the care document, not a verified per-plant fact --
 * the UI surfaces this distinction and it should be spot-checked before a
 * document goes to a client, same as the workbook's own legend notes for
 * its derived bands.
 */

interface Band {
  start: number;
  end: number;
  label: string;
}

const LIGHT_BANDS: Band[] = [
  { start: 0, end: 2, label: "Shade" },
  { start: 2, end: 4, label: "Partial Shade" },
  { start: 4, end: 5, label: "Filtered Sun" },
  { start: 5, end: 6, label: "Partial Sun" },
  { start: 6, end: 8, label: "Full Sun" },
];

const WATER_BANDS: Band[] = [
  { start: 0, end: 0.5, label: "Low" },
  { start: 0.5, end: 1.0, label: "Moderate" },
  { start: 1.0, end: 2.0, label: "Regular" },
];

function bandLabel(bands: Band[], min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const lo = min ?? max ?? 0;
  const hi = max ?? min ?? 0;
  const hits = bands.filter((b) => b.start < hi + 1e-9 && b.end > lo - 1e-9);
  if (hits.length === 0) return null;
  if (hits.length === 1) return hits[0].label;
  return `${hits[0].label} – ${hits[hits.length - 1].label} (adaptable)`;
}

export function lightBandLabel(p: Plant): string | null {
  return bandLabel(LIGHT_BANDS, p.lightMinHrs, p.lightMaxHrs);
}

export function waterBandLabel(p: Plant): string | null {
  return bandLabel(WATER_BANDS, p.waterMinInWk, p.waterMaxInWk);
}

const WATER_TIPS: Record<string, string> = {
  Low: "Allow soil to dry between waterings once established. Many low-water plants are prone to root rot in irrigated or poorly-draining soil -- confirm drainage before planting.",
  Moderate: "Water when the top 2–3 inches of soil are dry. Established plants typically need supplemental water only during dry/hot stretches.",
  Regular: "Keep soil consistently moist, especially during the first one to two growing seasons. Mulch to reduce evaporation between waterings.",
  "Low – Moderate (adaptable)": "Tolerant of a range of watering schedules; err toward less water once the plant is established.",
  "Moderate – Regular (adaptable)": "Adapts to a range of watering schedules; increase frequency during hot, dry, or windy periods.",
  "Low – Regular (adaptable)": "Broadly adaptable to available water -- confirm the target zone's actual schedule before finalizing irrigation.",
};

const LIGHT_TIPS: Record<string, string> = {
  Shade: "Best under tree canopy or on north-facing exposures. Too much direct San Diego coastal/inland sun can scorch foliage.",
  "Partial Shade": "Morning sun with afternoon shade is usually ideal, particularly in inland San Diego County where afternoon heat is more intense than coastal areas.",
  "Filtered Sun": "Performs well under high, open canopy (e.g. filtered through palms or open-branched trees) rather than deep shade or unshaded exposure.",
  "Partial Sun": "Tolerates several hours of direct sun; inland plantings may benefit from afternoon shade relief.",
  "Full Sun": "Needs a minimum of 6 hours of direct sun daily. Coastal fog belt sites (immediate Oceanside/Carlsbad coastline) may need to confirm actual sun exposure before relying on inland sun totals.",
  "Shade – Partial Shade (adaptable)": "Adaptable to low-light conditions from deep shade to morning sun with afternoon shade. Avoid prolonged direct afternoon sun.",
  "Partial Shade – Filtered Sun (adaptable)": "Performs well in dappled or indirect light; tolerates brief morning sun but benefits from protection during peak afternoon hours.",
  "Filtered Sun – Partial Sun (adaptable)": "Flexible light requirements — suitable for sites with a mix of filtered canopy and a few hours of direct sun per day.",
  "Partial Sun – Full Sun (adaptable)": "Broadly sun-tolerant; performs in partial sun and thrives with more exposure. Coastal foggier sites and inland full-sun sites should both work well.",
  "Shade – Filtered Sun (adaptable)": "Adaptable across a wide shade-to-filtered-sun range. Avoid deep unbroken shade and strong afternoon sun in inland areas.",
  "Shade – Partial Sun (adaptable)": "Wide light adaptability; best with some indirect or morning light but can handle shadier exposures. Confirm placement before planting in intense inland-sun spots.",
  "Partial Shade – Full Sun (adaptable)": "Broadly adaptable to a wide range of light conditions; inland sites with intense afternoon sun should confirm tolerance before planting.",
  "Shade – Full Sun (adaptable)": "Extremely adaptable to available light. Confirm the specific cultivar's sun tolerance before siting in full-sun inland exposures.",
};

const CATEGORY_TIPS: Record<string, string> = {
  "cactus-succulents": "Use fast-draining, mineral-rich soil (avoid heavy amended garden soil). Overwatering is the most common cause of failure in San Diego's clay-heavy inland soils.",
  "citrus-avocado": "Fertilize during the active growing season (spring–early fall) and taper off in winter. Protect from frost on the rare inland cold nights; avocado is notably wind- and salt-sensitive near the immediate coast.",
  "roses": "Deadhead spent blooms to encourage rebloom. In San Diego's mild winters, a light dormant-season pruning (Jan–Feb) is typically sufficient rather than a hard freeze-driven cutback.",
  "ferns": "Protect from direct afternoon sun and drying Santa Ana wind events; benefits from regular misting or higher ambient humidity.",
  "palms": "Water deeply and infrequently once established; most landscape palms in this region tolerate the county's mild winters without frost protection.",
  "conifers": "Established conifers are generally low-maintenance; watch new plantings for adequate water during the first two summers.",
  "grasses-grass-like-plants": "Cut back ornamental grasses in late winter before new spring growth emerges.",
  "vines": "Provide a trellis, wire, or structure appropriate to the plant's climbing habit (twining vs. clinging) at planting time, not after it has grown in.",
  "camellias-azaleas-rhododendrons": "Prefer acidic, well-draining soil and filtered light; San Diego's often-alkaline soils may need soil amendment or acidifying fertilizer.",
  "edibles-fruit-vegetables": "Follow seasonal planting windows for San Diego's mild-winter climate rather than a generic national planting calendar.",
};

export function generateCareNotes(p: Plant): string[] {
  const notes: string[] = [];
  const water = waterBandLabel(p);
  const light = lightBandLabel(p);
  if (water && WATER_TIPS[water]) notes.push(WATER_TIPS[water]);
  else if (water) notes.push(`Water needs: ${water}.`);
  if (light && LIGHT_TIPS[light]) notes.push(LIGHT_TIPS[light]);
  else if (light) notes.push(`Light needs: ${light}.`);
  if (CATEGORY_TIPS[p.category]) notes.push(CATEGORY_TIPS[p.category]);
  if (p.caNative === "Yes" || p.caNative === "Y") {
    notes.push("California native -- once established, typically needs minimal supplemental irrigation and supports local pollinators/wildlife.");
  }
  return notes;
}
