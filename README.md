# KLR Plant Care Document Builder

A React app built around KLR's plant master catalog (3,424 items as of the
2026-08-24 workbook). Browse/search the catalog, view a care dashboard for
any item tailored to San Diego County conditions, select varieties, and
generate a client-facing plant care document (Word .docx or print-to-PDF).

## Running it

```
npm install
npm run dev        # local dev server, http://localhost:5173
```

To build a static production bundle (deployable to any static host --
Netlify, S3, an internal server, etc.):

```
npm run build       # outputs to dist/
npm run preview     # serves dist/ locally to sanity-check the build
```

This is a fully client-side app -- no backend/server required. Open
`dist/index.html` behind any static file server (not `file://` directly --
browsers block some of the storage/module features from a raw file path).

## How the dataset works

- The original master catalog (`KLR_plant_master_catalog_updated_1.xlsx`,
  "All Plants" sheet + "Supplemental Attributes (New)" sheet joined on
  Botanical Name) is baked into the app at `src/data/plants.base.json` as
  the starting dataset.
- On first load, that dataset is copied into the browser's IndexedDB. From
  then on the app reads/writes IndexedDB, so edits persist across reloads
  **in that browser** without needing a server.
- **Manage Dataset** page (top nav) lets you:
  - Re-upload the master workbook (or any .xlsx/.csv with matching
    headers) to bulk-add/update rows. Rows are matched by botanical name
    (falling back to common name); matches update in place, everything
    else is added as new.
  - Download a simple CSV template for incremental updates without needing
    all 60 original columns.
  - Add/edit/delete individual plants by hand.
  - Reset back to the original master catalog at any time (discards
    browser-local edits).
- Because the dataset lives in the browser's IndexedDB, it is per-browser/
  per-device, not shared automatically across users. To roll a bulk edit
  out to every user, re-export an updated workbook and have each person
  import it (or replace `src/data/plants.base.json` and re-deploy -- that
  becomes the new "reset to original" baseline).

## Assumptions worth flagging

- **San Diego County zone band** (`src/lib/sanDiego.ts`): "suited to San
  Diego County" is computed as USDA zones 9-10 OR Sunset zones 18-24, which
  covers KLR's Oceanside/North County coastal base through typical inland
  valley sites. High-elevation east-county sites (Julian, Mt. Laguna) fall
  outside this default and would need the constant edited for a project
  out there.
- **Units**: the source workbook stores height/width in meters; the UI
  converts to feet for the homeowner-facing document since that's the
  expected unit for a US residential audience.
- **Care Notes** (`src/lib/careTips.ts`) are generic, widely-published
  horticultural rules of thumb derived from each plant's light/water band
  and category -- not sourced from that specific plant's record. The UI
  labels this section "draft -- verify before finalizing" for exactly that
  reason; spot-check before it goes in front of a client, same caution the
  workbook's own legend gives for its derived light/water bands.
- **Materials** (Bulk Soils & Mulches, Dry Goods, Sod) are catalog items
  but not living plants -- their detail page and the generated document
  skip the care dashboard and just note them as a line item.
- **Images**: no photos exist yet for any item. Every card/detail view
  shows a category-appropriate placeholder icon. Add a real photo either
  by editing a plant (Image URL field) or via bulk import (an "Image URL"
  column in the uploaded file/template). Swap in real URLs whenever photos
  are available -- no code change needed.

## Tech stack

Vite + React + TypeScript, Tailwind CSS, Zustand (state), IndexedDB via
`idb-keyval` (dataset persistence), `xlsx` (SheetJS, for reading uploaded
catalog files client-side), `recharts` (size comparison chart), `docx` +
`file-saver` (Word export), `react-router-dom` (hash routing), `lucide-react`
(icons).
