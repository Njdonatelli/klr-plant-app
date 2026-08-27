# Branch archive

Record of the August 2026 branch cleanup: what was merged into `main`, what
was retired, and why. Retired branches are preserved as annotated
`archive/*` tags, so nothing is lost even after the branch is deleted.

## Merged into `main`

| Branch | Contents |
|---|---|
| `worktree-data-quality-pass` | Baseline zone corrections (202 records) + `baselineMigration.ts` so existing browsers pick up catalog fixes |
| `claude/klr-audit-findings-gngx51` | Security/resilience audit fixes: URL scheme validation, `ErrorBoundary`, guarded persistence (`initError`/`persistError`), removal of the stale Jekyll workflow |
| `claude/claude-md-documentation-qe6i2h` | `CLAUDE.md` codebase documentation |

Two conflicts were resolved during the audit merge:

- **`useStore.ts`** — kept the audit branch's error-handling restructure and
  re-applied the baseline-migration logic inside its `init()`.
- **`PlantDetail.tsx`** — kept main's responsive padding, took the audit
  branch's `navigate("/")` so the back button cannot navigate out of the app.

## Archived

### `archive/blind-spot-pass` (was `claude/blind-spot-pass-qzca6y`)

Adds `BLIND_SPOT_REPORT.md`, a 423-line point-in-time audit report. Its
actionable findings were addressed by the audit-findings branch, which was
merged. The report is a snapshot of a codebase state that no longer exists,
so it was not merged into `main` — read it from the tag if the reasoning is
ever needed.

### `archive/db-quality-stale-schema` (was `claude/klr-plant-app-db-quality-f7e737`)

A zone-corruption fix for `plants.base.json` built on an **older catalog
generation** — it predates the `p1` → `base-N` id migration and the
`description` field, so its dataset shares zero record ids with current
`main` and cannot be merged directly.

Its corrections were compared against merged `main` by botanical name.
Of 523 zone-field changes, 519 are already present in `main` via the
data-quality pass. The 4 that were not:

| Plant | Field | `main` | archived branch | Action |
|---|---|---|---|---|
| `Agave americana 'Scabra'` | `sunsetZoneText` | `10, 12 - 24: H1, H2` | `10, 12 - 24; H1, H2` | **applied** — `:` should be `;` |
| `Cordyline 'Roma 06' PP 24,764` | `sunsetZoneText` | `8, 9 14 - 24` | `8, 9, 14 - 24` | **applied** — missing comma |
| `Cordyline 'Tana' PP 18,605` | `sunsetZoneText` | `8, 9 14 - 24` | `8, 9, 14 - 24` | **applied** — missing comma |
| `Abelia hybrid 'Hopleys'` | `sunsetZoneText` | `4 - 25; H1, H2` | `4 - 24; H1, H2` | **not applied** — genuine disagreement, needs a source check |

The three punctuation fixes were applied to `main` directly (with
`BASE_DATASET_VERSION` bumped to 3 so existing browsers receive them). The
fourth is a real value conflict about whether Sunset zones for
*Abelia* 'Hopleys' end at 24 or 25; it is left as-is pending a look at the
authoritative source. These are display-text only — the parsed
`sunsetZones` arrays already agreed in all four cases.

## Deleting the archived branches

The tags preserve full history, so the branches are safe to delete:

```sh
git push origin --delete claude/blind-spot-pass-qzca6y
git push origin --delete claude/klr-plant-app-db-quality-f7e737
```

To read an archived branch later: `git show archive/db-quality-stale-schema`
or `git checkout -b review archive/db-quality-stale-schema`.
