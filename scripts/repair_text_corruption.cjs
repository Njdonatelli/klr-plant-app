#!/usr/bin/env node
/*
 * Repairs the text corruption introduced into src/data/plants.base.json by
 * commit 268d3f9.
 *
 * Two defects were introduced by that commit's ingest pass:
 *
 *   1. A global `z` -> `uz` substitution on several string fields, which also
 *      lower-cased capitals (`Zinnia` -> `uzinnia`, `Jazz` -> `Jauzuz`,
 *      `amazonaws` -> `amauzonaws`). This broke display names, botanical
 *      names, the `camellias-azaleas-rhododendrons` category key, source URLs
 *      and image URLs.
 *   2. Non-ASCII characters were stripped, dropping the registered-trademark
 *      sign from cultivar names (`Sunpatiens(R)` -> `Sunpatiens`).
 *
 * The commit immediately before it (REF_CLEAN) still holds uncorrupted values
 * for every field that existed at the time, so those fields are restored
 * verbatim rather than guessed at. Records are matched by array index: the
 * ingest renumbered `id` (p1 -> base-1) but preserved order and length.
 *
 * A field is only restored when the current value still equals the corrupted
 * value, so the deliberate zone corrections made in later commits are left
 * untouched.
 *
 * `imageUrl` did not exist before the corrupting commit, so it has no clean
 * reference. It is repaired arithmetically instead: because the substitution
 * was global, no surviving image URL contains a `z` that is not preceded by a
 * `u`, which makes `uz` -> `z` an exact inverse for lower-case input (a real
 * `uz` was itself corrupted to `uuz` and so round-trips correctly). Only an
 * upper-case `Z` is unrecoverable, since its case was destroyed; it is
 * restored where the surrounding characters are unambiguously upper-case.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REF_CLEAN = "1ee1e2b"; // last commit before the corruption
const REF_CORRUPT = "268d3f9"; // the commit that introduced it
const DATA = path.join("src", "data", "plants.base.json");

/** Fields with a trustworthy pre-corruption value to restore from. */
const RESTORE_FIELDS = [
  "commonName",
  "botanicalName",
  "category",
  "heightText",
  "sourceUrl",
  "caNative",
  "wucols",
  "supplementalNotes",
  "usdaZoneText",
  "sunsetZoneText",
];

const SUNSET_MAX_ZONE = 24;

function readAtRef(ref) {
  return JSON.parse(
    execFileSync("git", ["show", `${ref}:${DATA}`], {
      encoding: "utf8",
      maxBuffer: 1 << 30,
    })
  );
}

/** Invert the global `z` -> `uz` substitution on a URL. */
function uncorruptUrl(url) {
  if (!url) return url;
  // Neighbours are inspected by offset rather than captured, so that adjacent
  // pairs (`Fizzy` -> `Fiuzuzy`) are both matched instead of the first match
  // swallowing the second one's `u`.
  return url.replace(/uz/g, (match, offset, whole) => {
    const before = whole[offset - 1] || "";
    const after = whole[offset + 2] || "";
    return /[A-Z]/.test(before) && /[A-Z]/.test(after) ? "Z" : "z";
  });
}

function main() {
  const current = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const clean = readAtRef(REF_CLEAN);
  const corrupt = readAtRef(REF_CORRUPT);

  if (clean.length !== current.length || corrupt.length !== current.length) {
    throw new Error(
      `record count drift: clean=${clean.length} corrupt=${corrupt.length} current=${current.length}`
    );
  }

  const counts = {};
  const bump = (key) => {
    counts[key] = (counts[key] || 0) + 1;
  };

  current.forEach((plant, i) => {
    for (const field of RESTORE_FIELDS) {
      const wasCorrupted = corrupt[i][field] !== clean[i][field];
      const stillCorrupted = plant[field] === corrupt[i][field];
      if (wasCorrupted && stillCorrupted) {
        plant[field] = clean[i][field];
        bump(field);
      }
    }

    const repairedImage = uncorruptUrl(plant.imageUrl);
    if (repairedImage !== plant.imageUrl) {
      plant.imageUrl = repairedImage;
      bump("imageUrl");
    }

    // Sunset zones stop at 24; a later zone pass expanded a "4 - 25" source
    // string literally and produced an out-of-range zone.
    const trimmed = plant.sunsetZones.filter((z) => z <= SUNSET_MAX_ZONE);
    if (trimmed.length !== plant.sunsetZones.length) {
      plant.sunsetZones = trimmed;
      bump("sunsetZones");
    }
  });

  fs.writeFileSync(DATA, `${JSON.stringify(current, null, 2)}\n`);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  for (const [field, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${field}`);
  }
  console.log(`${total} field values repaired across ${current.length} records`);
}

main();
