# Blind Spot Pass — KLR Plant Care Builder

**Date:** 2026-08-27  
**Audit scope:** Data handling, UI resilience, storage, deployment, security

## Summary

- **10 High severity** findings: production risk, data loss, security vulnerabilities
- **14 Medium severity** findings: operational issues, edge-case crashes, user-facing problems
- **11 Low/informational** findings: technical debt, minor UX gaps

---

## 1. Deployment & CI (4 findings)

### 🔴 HIGH: Two GitHub Actions workflows race on every push to main

Both `deploy.yml` (Vite build) and `jekyll-gh-pages.yml` (Jekyll build) trigger on push to `main` and deploy to the same GitHub Pages environment. They share the `"pages"` concurrency group but disagree on `cancel-in-progress`:

- `deploy.yml`: `cancel-in-progress: true`
- `jekyll-gh-pages.yml`: `cancel-in-progress: false`

If the Jekyll workflow wins the race, it deploys a broken Jekyll build of a React project, overwriting your static Vite output. The Jekyll file appears vestigial and should be **deleted immediately**.

**Location:** `.github/workflows/jekyll-gh-pages.yml`

---

### 🟠 MEDIUM: No test or lint step in CI

The deploy workflow runs `npm ci && npm run build` but never runs `npm run lint` or `npm test`. TypeScript errors caught by `tsc --noEmit` are not checked before deploy. Broken code can ship to production uncaught.

**Location:** `.github/workflows/deploy.yml`

---

### 🔵 INFO: Node version pinned only to major

`node-version: 20` uses whatever latest 20.x is available. A patch release with a breaking change could silently break builds. Better to pin to a minor (e.g., `20.11`) or use an `.nvmrc` file.

**Recommendation:** Add `node-version-file: .nvmrc` and create `.nvmrc` with `20.11.1` (or your preferred minor).

---

### 🔵 INFO: No staging/preview environment

No build-time configuration, no environment variables, and no PR preview deploys. Every push to `main` goes straight to production.

---

## 2. App Resilience (5 findings)

### 🔴 HIGH: No React Error Boundary anywhere in the app

If any component throws during render (corrupted IndexedDB value, unexpected `null` field, bad parse), the entire app white-screens with no recovery path and no error message. Zero instances of `ErrorBoundary`, `componentDidCatch`, or `react-error-boundary` in the codebase.

**Location:** `src/App.tsx`

**Fix:** Wrap the app in an error boundary that catches render errors and displays a user-facing error page with a reload button.

---

### 🔴 HIGH: `init()` failure leaves users on a permanent loading screen

If `loadStoredDataset()` throws (e.g., IndexedDB blocked in Safari private browsing), `isLoaded` never becomes `true`. The user sees "Loading catalog..." forever with no error message, no retry button, and no fallback.

**Location:** `src/store/useStore.ts` → `init()`

**Fix:** Add error handling to `init()` with a user-facing error message and a "Retry" button. Consider falling back to in-memory-only mode if storage is unavailable.

---

### 🟠 MEDIUM: No 404 / catch-all route

The router defines exactly four paths. Any other URL (e.g., `/#/settings`, `/#/typo`) renders a blank white page below the nav with no feedback.

**Location:** `src/App.tsx` → `<Routes>`

**Fix:** Add `<Route path="*" element={<NotFound />} />` at the end of the routes list.

---

### 🟠 MEDIUM: No global error handler for async failures

No `window.onerror` or `window.onunhandledrejection` handler. Async errors that escape promise chains (like IndexedDB failures) are silently swallowed.

**Location:** `src/main.tsx`

---

### 🔵 INFO: `navigate(-1)` after delete is fragile

After deleting a plant, `navigate(-1)` goes to the browser's previous history entry. If a user landed on the detail page directly (bookmark, shared link), this navigates to a completely different site.

**Location:** `src/components/PlantDetail.tsx:133`

**Better:** Navigate to the dashboard (`navigate('/')`) instead of relying on history.

---

## 3. Security (2 findings)

### 🔴 HIGH: XSS via `javascript:` URLs in supplemental notes

`renderNotes` parses markdown-style links from `supplementalNotes` and places the URL directly into an `<a href>` tag. A plant with notes containing `[click me](javascript:alert(1))` creates a live `javascript:` link. The `sourceUrl` field has the same issue.

Since data can be imported from external spreadsheets, this is a real attack surface.

**Location:** `src/components/PlantDetail.tsx:21`

**Fix:** Sanitize URLs before placing them in `href` attributes. Use `new URL()` to parse and reject non-http(s) schemes:

```typescript
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return /^https?:/.test(parsed.protocol);
  } catch {
    return false;
  }
};
```

---

### 🟠 MEDIUM: No Content Security Policy

No `<meta http-equiv="Content-Security-Policy">` tag and no CSP headers from GitHub Pages. Any injected script runs with full page privileges.

**Location:** `index.html`

**Fix:** Add a basic CSP header:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'">
```

GitHub Pages cannot inject custom headers, so this would need to be enforced via `<meta>` or a deployment to a custom domain with server-side headers.

---

## 4. Storage & Persistence (5 findings)

### 🔴 HIGH: IndexedDB write failures are unhandled everywhere

Every store action that writes to IndexedDB (`persist()`) can throw on quota exceeded, permission denied, or private-browsing restrictions. None handle the error.

A failed write means in-memory state diverges from storage: the user sees their changes, but they vanish on reload. Affects import, add, edit, delete, and reset operations.

**Location:** `src/store/useStore.ts` → `persist()`

**Fix:** Wrap all `persist()` calls in try/catch with user-facing feedback (toast, error message). Consider falling back to in-memory-only mode if storage quota is exceeded.

---

### 🔴 HIGH: No runtime data validation layer

No Zod schemas, no type guards, no runtime validation. Data flows from xlsx parse → `Partial<Plant>` → cast to `Plant` → IndexedDB → cast back → store → export, with every transition trusting the shape blindly.

A corrupted IndexedDB entry or a malformed import row silently propagates bad data through the entire pipeline.

**Location:** `src/types.ts`, `src/lib/importDataset.ts`, `src/lib/storage.ts`

**Recommendation:** Add a lightweight validation library (Zod) and validate at persistence boundaries (on load from IndexedDB, after parsing imports).

---

### 🟠 MEDIUM: Selection and dataset stored in different mechanisms

The plant dataset lives in IndexedDB; the selection (plant IDs for the care document) lives in localStorage. These can desync: clearing one but not the other leaves dangling references. Quota eviction or private-browsing restrictions can affect one store but not the other.

**Location:** `src/lib/storage.ts`

---

### 🟠 MEDIUM: localStorage write failure is silent to the user

`saveSelection` has a try/catch that only logs to console. If localStorage is full, the user gets no feedback that their selection stopped persisting. Selections made after the failure vanish on reload.

**Location:** `src/lib/storage.ts:35-38`

**Fix:** Return a boolean from `saveSelection` indicating success/failure. Display a toast to the user if the save fails.

---

### 🔵 INFO: No concurrency protection on writes

The store has no version counter, no compare-and-swap, and no mutex. Two concurrent `importPlants` calls (unlikely in a single-tab app, but possible via rapid double-click) can silently lose one import's changes.

---

## 5. Data Import (5 findings)

### 🔴 HIGH: No file size limit on import

The file input accepts any `.xlsx/.xls/.csv` with no size check. A 500 MB Excel file would be loaded entirely into memory via `file.arrayBuffer()`, likely freezing or crashing the browser tab.

The `accept` attribute is cosmetic only — dragging a `.json` or `.pdf` still triggers the parser.

**Location:** `src/components/DatasetManager.tsx`

**Fix:** Add a file size check before parsing:
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
if (file.size > MAX_FILE_SIZE) {
  showError("File is too large (max 10 MB)");
  return;
}
```

---

### 🟠 MEDIUM: Import assumes dimensions are always in meters

All height/width values from imported spreadsheets are stored directly as meters. There is no feet-to-meters conversion function.

If a user enters or imports data in feet (common in the US landscape industry), the values are stored raw, producing plants that display as impossibly large (e.g., a "6-foot" shrub rendered as 6 meters = 19.7 feet).

**Location:** `src/lib/units.ts`, `src/lib/importDataset.ts`

**Fix:** Add a feet-to-meters conversion function and allow the importer to specify units (or auto-detect based on reasonableness of values).

---

### 🟠 MEDIUM: Category slugging strips hyphens, merging distinct categories

The slug function removes all non-alphanumeric characters, so both `"Shrubs - Evergreen"` and `"Shrubs-Evergreen"` and `"Shrubs: Evergreen"` all become `"shrubsevergreen"`.

But `CATEGORY_LABELS` expects hyphenated keys like `"shrubs-evergreen"`. Imported categories may not match existing labels, causing raw slugs like `"citrusavocado"` to appear in the UI and exported documents.

**Location:** `src/lib/importDataset.ts`

**Fix:** Update the slug function to preserve hyphens: replace non-alphanumeric with hyphens instead of removing them entirely.

---

### 🟠 MEDIUM: No progress indicator or row count during import

The `busy` state shows "Importing..." but gives no feedback on how many rows were processed, how many matched existing plants, or how many were new. For a 3,400-row catalog, the operation takes several seconds with no visible progress.

**Location:** `src/components/DatasetManager.tsx`

**Recommendation:** Show row count and a progress bar during parsing.

---

### 🔵 INFO: Botanical name matching is the sole merge key

Plants are matched for upsert by normalized botanical name, with a fallback to common name. If two distinct cultivars share a common name but have no botanical name, they collide silently. There is no conflict resolution UI.

---

## 6. Validation & Data Integrity (6 findings)

### 🔴 HIGH: PlantForm allows min > max for all numeric ranges

Only `commonName` is validated as required. Height, width, light hours, and water needs have no min ≤ max check.

Setting light min at 8 and max at 2 is accepted and produces nonsensical gauges, inverted size charts, and wrong care-tip assignments.

**Location:** `src/components/PlantForm.tsx:74`

**Fix:** Add validation:
```typescript
if (form.heightMinM >= form.heightMaxM) {
  errors.height = "Minimum must be less than maximum";
}
```

---

### 🟠 MEDIUM: Negative numeric values accepted everywhere

Negative heights, widths, light hours, and water needs are not rejected. A negative height converts to a negative feet value and displays as `"-6.6 ft"`. No guard rejects nonsensical negative dimensions.

**Location:** `src/components/PlantForm.tsx`, `src/lib/units.ts`

**Fix:** Add `min="0"` to numeric inputs in PlantForm.

---

### 🟠 MEDIUM: CA Native field is free text, not a dropdown

The input accepts any string, but filtering and care-tip logic only check for exact `"Yes"` or `"Y"`. Entering `"yes"`, `"YES"`, `"true"`, or `"Native"` silently fails to match. The import function preserves case, so a spreadsheet with lowercase values is ignored.

**Location:** `src/components/PlantForm.tsx:167`, `src/lib/careTips.ts:90`

**Fix:** Change to a dropdown with options `["Yes", "No"]` or normalize to boolean.

---

### 🟠 MEDIUM: Plant ID collision on rapid add

New plant IDs use `Date.now()`. If a user saves twice in the same millisecond, the second plant overwrites the first via `upsertPlant` instead of creating a distinct entry.

**Location:** `src/components/PlantForm.tsx:17`

**Fix:** Use a UUID or a server-side ID, or combine timestamp with a random suffix: `` `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` ``

---

### 🔵 INFO: Image URL and Source URL are not validated

Any string is accepted for both fields. Non-URL values produce broken `<img>` tags (though the placeholder handles this gracefully). Combined with the `javascript:` href issue, unvalidated URLs are an attack surface.

**Fix:** Validate URLs on blur or submit; reject non-http(s) schemes.

---

### 🔵 INFO: Filter dropdowns are hardcoded, can drift from data

Water and light filter options are hardcoded in `FilterBar.tsx`. If `waterBandLabel` or `lightBandLabel` returns a value not in the dropdown (e.g., a new band from updated logic), those plants become unfilterable.

**Location:** `src/components/FilterBar.tsx:66-83`

**Fix:** Derive filter options from the data (`plants.map(p => lightBandLabel(p))`) rather than hardcoding.

---

## 7. Care Tips & Zone Logic (4 findings)

### 🟠 MEDIUM: Compound light labels have no care-tip entries

`LIGHT_TIPS` has entries only for single-band labels (`"Shade"`, `"Full Sun"`, etc.). When a plant spans multiple light bands, `bandLabel` returns a compound like `"Shade – Partial Sun (adaptable)"`, which has no match.

Unlike `WATER_TIPS` which has compound entries, `LIGHT_TIPS` has none. Any plant with a wide light range gets only generic guidance.

**Location:** `src/lib/careTips.ts`

**Fix:** Add compound entries to `LIGHT_TIPS` for common ranges like `"Shade – Partial Shade"`, `"Partial Sun – Full Sun"`, etc.

---

### 🟠 MEDIUM: `sunsetSpecial` zones are never checked for suitability

`sdSuitability` checks `sunsetZones` (numeric) but never checks `sunsetSpecial` (the A1–A3, H1–H2 array). If a plant's only zone data is in `sunsetSpecial`, `hasAnyZoneData` returns false, so the plant gets "unknown" instead of the correct classification.

**Location:** `src/lib/sanDiego.ts`

**Fix:** Check `p.sunsetSpecial && p.sunsetSpecial.length > 0` in `hasAnyZoneData` and `sdSuitability`.

---

### 🔵 INFO: Zone text and numeric arrays can disagree

A plant might have `usdaZoneText = "Zone 10"` but an empty `usdaZones` array (if import only populated the text field). `hasAnyZoneData` returns true, but suitability only checks the numeric arrays, returning "marginal" for what is clearly a zone-10 plant.

**Location:** `src/lib/sanDiego.ts`

**Fix:** Fall back to parsing zone text if numeric arrays are empty.

---

### 🔵 INFO: USDA sub-zones (9a/9b/10a/10b) are collapsed to integers

San Diego spans 9b through 10b, but the dataset stores zones as integers. A plant suited only for zone 10b (warmer) is reported as "suited" even for a 9b site.

This is documented as a known simplification but limits accuracy for microclimate guidance. **This is acceptable as long as it's documented.**

---

## 8. Document Export (4 findings)

### 🟠 MEDIUM: DOCX export has no error handling

`Packer.toBlob` and `saveAs` can fail (memory pressure with a large document, popup blocker, browser policy). The error is unhandled — the button returns to "Export Word" with no message.

**Location:** `src/lib/exportDocx.ts:182-184`

**Fix:** Wrap in try/catch and show a user-facing error toast.

---

### 🟠 MEDIUM: Markdown in supplemental notes leaks raw syntax into DOCX

The export strips `[text](url)` markdown links but no other markdown. Bold (`**text**`), italic (`*text*`), headers (`#`), and bullet lists (`- item`) pass through as raw syntax into the client-facing Word document.

**Location:** `src/lib/exportDocx.ts:131`

**Fix:** Use a markdown-to-HTML parser (e.g., `marked`) and convert the HTML to DOCX, or strip all markdown syntax.

---

### 🔵 INFO: No upper limit on plants in document

100+ selected plants renders all cards at once (no virtualization) and builds a very large DOCX in memory. Print view uses `page-break-before: always` on each card, so 100 plants = 100 pages, which may time out the browser's print dialog.

**Recommendation:** Add a warning for 50+ plants, or implement virtualization for the print view.

---

### 🔵 INFO: Filename sanitization can produce degenerate names

If `clientName` is all special characters (e.g., `"???"`) the regex produces `"-"`, resulting in a filename of `"-.docx"`. No fallback to a default name.

**Location:** `src/lib/exportDocx.ts:183`

**Fix:** Use a fallback name like `"Plant-Care-Plan.docx"` if sanitization produces an empty string.

---

## Priority Fixes (Quick Wins)

1. **Delete `.github/workflows/jekyll-gh-pages.yml`** — eliminates deployment race condition (5 min)
2. **Add React Error Boundary to `src/App.tsx`** — prevents white-screen crashes (15 min)
3. **Sanitize `href` URLs in `PlantDetail.tsx:21`** — closes XSS vector (10 min)
4. **Add error handling to `init()` with retry UI** — prevents permanent loading screen (20 min)
5. **Add try/catch around `persist()` calls with toast** — prevents silent data loss (20 min)
6. **Add file size check to import** — prevents browser crash on large files (5 min)
7. **Add CI lint step** — catches broken code before deploy (2 min)

---

## Cross-Cutting Concerns

**Data validation:** The absence of a validation layer is a systemic issue. Consider adding lightweight runtime validation (Zod) at storage boundaries.

**Error handling:** Many operations that can fail (storage, export, import) have no error feedback to the user. Establish a consistent error-handling pattern (try/catch + toast notifications).

**Testing:** No CI test step means quality regressions ship to production. Add `npm run lint` and consider unit tests for critical paths (import logic, zone suitability, unit conversion).

---

**End of Report**
