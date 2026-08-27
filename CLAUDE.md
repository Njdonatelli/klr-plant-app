# KLR Plant Care Builder — CLAUDE.md

## What this app does

A fully client-side React app for KLR (a plant nursery/landscaping company).
It lets staff browse a catalog of ~3,400 plants, view care dashboards tailored
to San Diego County conditions, select a subset of plants, and export a
client-facing care document as a Word .docx or print-to-PDF.

No backend. All data persistence is browser-local (IndexedDB + localStorage).

---

## Tech stack

| Layer | Library |
|---|---|
| Build | Vite 5, TypeScript 5 |
| UI | React 18, Tailwind CSS 3 |
| Routing | react-router-dom 6 (HashRouter — works on static hosts) |
| State | Zustand 5 |
| Persistence | idb-keyval (IndexedDB), localStorage |
| Excel import | xlsx (SheetJS) — client-side only |
| Word export | docx + file-saver |
| Charts | recharts |
| Icons | lucide-react |

---

## Repository layout

```
src/
  App.tsx              # Root: Nav, HashRouter, top-level Routes
  main.tsx             # Entry point
  index.css            # Tailwind base + custom `klr-*` color tokens
  vite-env.d.ts

  types.ts             # Plant interface, CATEGORY_LABELS, NON_PLANT_CATEGORIES
  store/
    useStore.ts        # Zustand store — all state & async persistence ops

  data/
    plants.base.json   # Baked-in master catalog (source of truth for resets)

  lib/
    storage.ts         # IndexedDB read/write via idb-keyval; localStorage for selection
    sanDiego.ts        # SD zone constants & sdSuitability() helper
    units.ts           # Metric ↔ imperial conversions (meters → feet)
    careTips.ts        # Generic care tip generation from light/water bands + category
    importDataset.ts   # Merge logic for bulk xlsx/csv imports
    exportDocx.ts      # Word document generation

  components/
    Dashboard.tsx      # Catalog grid: search, filter, plant cards
    PlantCard.tsx      # Single card in the grid
    PlantDetail.tsx    # Full detail page: care gauges, size chart, zone badge
    FilterBar.tsx      # Category/zone filter controls
    SelectionTray.tsx  # Floating tray showing selected count + go-to-document CTA
    CareDocument.tsx   # Document preview & export (selected plants)
    DatasetManager.tsx # Import xlsx/csv, add/edit/delete plants, reset to original
    PlantForm.tsx      # Add/edit individual plant modal
    ZoneBadge.tsx      # Suited/marginal/unknown SD suitability chip
    Gauge.tsx          # Water/light radial gauge component
    SizeChart.tsx      # Recharts bar chart for height/width comparison
    ImagePlaceholder.tsx # Category icon when no photo exists

.github/workflows/
  deploy.yml           # CI: build on push to main, deploy to GitHub Pages
```

---

## Development commands

```bash
npm install         # install deps
npm run dev         # dev server at http://localhost:5173
npm run build       # TypeScript check + Vite build → dist/
npm run preview     # serve dist/ locally
npm run lint        # tsc --noEmit (type-check only, no ESLint configured)
```

There are **no tests**. Type-checking (`npm run lint`) is the only automated
quality gate.

---

## Data model

The core type is `Plant` in `src/types.ts`. Key fields:

- `id` — string, unique identifier
- `commonName` / `botanicalName`
- `category` — slug key into `CATEGORY_LABELS`
- Zone arrays: `usdaZones: number[]`, `sunsetZones: number[]`, `sunsetSpecial: string[]`
- Size: `heightMinM`/`heightMaxM`, `widthMinM`/`widthMaxM` (stored in **meters**)
- Light: `lightMinHrs`/`lightMaxHrs` (hours/day)
- Water: `waterMinInWk`/`waterMaxInWk` (inches/week)
- `isCustom?: boolean` — true for user-added/edited plants
- `updatedAt?: string` — ISO timestamp of last edit

`NON_PLANT_CATEGORIES` (bulk soils, dry goods, sod) are catalog items without
horticultural care data — the UI suppresses the care dashboard for these.

---

## State management

`src/store/useStore.ts` is a single Zustand store. Key actions:

| Action | What it does |
|---|---|
| `init()` | Load from IndexedDB on app start; falls back to base JSON |
| `toggleSelected(id)` | Add/remove a plant from the selection set |
| `upsertPlant(plant)` | Add new or update existing plant; persists to IndexedDB |
| `deletePlant(id)` | Remove plant; cleans selection; persists |
| `importPlants(rows)` | Merge-import rows (match by botanical name → common name) |
| `replaceDataset(rows)` | Full replace (wipes existing, resets selection) |
| `resetToOriginal()` | Restore `plants.base.json` baseline; wipes selection |

**Selection** (`selectedIds: Set<string>`) is persisted to `localStorage`
separately so it survives reloads without re-reading IndexedDB.

---

## San Diego zone logic

`src/lib/sanDiego.ts` defines what "suited to San Diego County" means:

```ts
SD_USDA_ZONES  = [9, 10]
SD_SUNSET_ZONES = [18, 19, 20, 21, 22, 23, 24]
```

`sdSuitability(plant)` returns `"suited" | "marginal" | "unknown"`.
- `"suited"` — plant's zones overlap SD zones
- `"marginal"` — zone data exists but no overlap
- `"unknown"` — no zone data at all

This constant is intentionally in one place. To adjust for a high-elevation
east-county project (Julian, Mt. Laguna), edit the constants here.

---

## Units

The source catalog stores dimensions in **meters**. `src/lib/units.ts` handles
conversions. The UI and Word export display **feet** for the US residential
audience.

---

## Care tips

`src/lib/careTips.ts` generates generic horticultural copy from a plant's
light hours, water band, and category. These are rule-of-thumb tips, not
sourced from the specific plant record. The UI labels this section
"draft — verify before finalizing." Do not treat them as authoritative without
review.

---

## Dataset import / export

`src/lib/importDataset.ts` handles bulk import logic:
- Matches incoming rows to existing plants by `botanicalName` (falls back to `commonName`)
- Returns `{ merged, added, updated }` counts

`src/lib/exportDocx.ts` builds a Word document from the selected plant list
using the `docx` library, then triggers a browser download via `file-saver`.

---

## Deployment

CI is in `.github/workflows/deploy.yml`:
- Triggers on push to `main` or manual dispatch
- Runs `npm ci && npm run build`
- Deploys `dist/` to GitHub Pages

The app uses `base: "./"` in `vite.config.ts` (relative paths) and
`HashRouter` so it works on GitHub Pages without server-side routing.

---

## Key conventions

1. **No backend** — everything runs in the browser. Do not add server-side
   code or API routes.
2. **One Zustand store** — all state lives in `useStore`. Don't create
   additional stores.
3. **Tailwind only** — no CSS modules, no styled-components. Custom colors
   are defined as `klr-*` tokens in `tailwind.config.js` and `index.css`.
4. **Metric storage, imperial display** — always store dimensions in meters;
   convert at render time via `src/lib/units.ts`.
5. **`NON_PLANT_CATEGORIES` guard** — check before rendering care sections.
   Materials don't have care data; don't fabricate it.
6. **IndexedDB is the source of truth at runtime** — `plants.base.json` is
   only the initial seed and reset target. Never mutate the JSON file to
   reflect user edits; mutate the store and let it persist to IndexedDB.
7. **Type-check before committing** — run `npm run lint` (tsc --noEmit) to
   catch type errors. There is no ESLint or formatter configured; keep code
   style consistent with existing files.
8. **`isCustom` flag** — set to `true` on any plant that didn't ship in
   `plants.base.json`. Used to distinguish user-managed rows from the
   original catalog.

---

## Common pitfalls

- **Don't read `dist/` into source** — it's gitignored; rebuild with
  `npm run build` when needed.
- **`file://` protocol won't work** — IndexedDB and ES modules are restricted
  on raw `file://` URLs. Use `npm run dev` or `npm run preview`.
- **Selection lives in localStorage, dataset in IndexedDB** — clearing
  site data in the browser will wipe both. `resetToOriginal()` restores
  the dataset but not the selection (it clears selection intentionally).
- **Bulk import matches on botanical name** — rows with a blank or mismatched
  `botanicalName` will add duplicates rather than update. Ensure the import
  file's botanical names match the catalog.
