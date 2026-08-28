#!/usr/bin/env node
/*
 * Cross-checks src/data/plants.base.json against the USDA PLANTS database.
 *
 * USDA PLANTS is a taxonomic and distribution authority, not a horticultural
 * one: it carries no hardiness zone, irrigation or light-exposure data. So the
 * catalog's zone/water/light/size fields cannot be validated against it, and
 * this script does not pretend to. What it does check is the three things
 * USDA is authoritative for:
 *
 *   1. `botanicalName` resolves to a real USDA taxon, and whether that taxon
 *      is accepted or a synonym of a currently accepted name.
 *   2. `caNative` agrees with USDA's native/introduced status for California.
 *   3. Whether the plant appears on California's noxious or invasive lists --
 *      the highest-consequence check here, since the catalog feeds a
 *      client-facing planting document.
 *
 * Names are matched on the binomial only. Cultivars ('Tricolor'), patent
 * numbers (PP 31,705) and trademark marks are stripped before lookup, because
 * USDA indexes species, not nursery cultivars. Records whose botanical name is
 * blank or genus-only are reported as unresolvable rather than guessed at.
 *
 * Findings are advisory. A "not found" is frequently a catalog plant that is
 * simply outside USDA's scope (a garden hybrid, an ornamental exotic), not a
 * misspelling -- so this writes a report for review and never edits the
 * catalog itself.
 *
 * Usage:
 *   node scripts/usda_crosscheck.cjs [--out report.json] [--limit N]
 *
 * Requires network access to plantsservices.sc.egov.usda.gov.
 */
const fs = require("fs");
const path = require("path");

const BASE = "https://plantsservices.sc.egov.usda.gov/api";
const DATA = path.join("src", "data", "plants.base.json");
const CACHE = path.join(".usda-cache");
const CONCURRENCY = 4;
const RETRIES = 3;

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested by scripts/usda_crosscheck.test.cjs)
// ---------------------------------------------------------------------------

/** USDA returns ScientificName with <i> markup around the epithets. */
function stripHtml(s) {
  return (s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Reduce a catalog botanical name to the binomial USDA would index it under.
 * Returns null when the name cannot yield a genus (blank, or junk).
 */
function toBinomial(botanicalName) {
  if (!botanicalName) return null;
  let s = botanicalName;

  s = s.split(",")[0]; // first name wins; the rest are listed synonyms
  s = s.replace(/[®™]/g, " ");
  s = s.replace(/\bPP\s*[\d,]+/gi, " "); // plant patent numbers
  s = s.replace(/\bPPAF\b/gi, " ");
  s = s.replace(/'[^']*'/g, " "); // cultivar epithets
  s = s.replace(/"[^"]*"/g, " ");
  s = s.replace(/\([^)]*\)/g, " ");
  s = s.replace(/[×✕]/g, " x ");
  s = s.replace(/\s+/g, " ").trim();

  const words = s.split(" ").filter(Boolean);
  if (!words.length) return null;

  const genus = words[0];
  // A leading abbreviation ("A. bainesii") has no recoverable genus.
  if (!/^[A-Z][a-z-]+$/.test(genus)) return null;

  // Skip an interstitial hybrid marker: "Salvia x jamensis".
  let i = 1;
  if (words[i] && /^x$/i.test(words[i])) i += 1;

  const species = words[i];
  // Species epithets are lower-case single words; anything else (a trade name,
  // "Series", "hybrids") means we only trust the genus.
  if (!species || !/^[a-z][a-z-]+$/.test(species)) return { genus, name: genus, rank: "genus" };
  return { genus, name: `${genus} ${species}`, rank: "species" };
}

/** Normalise for comparison: case, punctuation and hybrid markers folded out. */
function normaliseName(s) {
  return stripHtml(s)
    .toLowerCase()
    .replace(/[×✕]/g, " x ")
    .replace(/\bx\b/g, " ")
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pick the USDA record matching `binomial` from PlantSearch results.
 * Prefers an exact normalised hit; falls back to a record whose scientific
 * name starts with the binomial (USDA appends the taxonomic author).
 */
function pickMatch(binomial, records) {
  const want = normaliseName(binomial);
  if (!want) return null;
  const scored = records.map((r) => ({
    record: r,
    norm: normaliseName(r.ScientificName),
  }));
  return (
    scored.find((c) => c.norm === want)?.record ||
    scored.find((c) => c.norm.startsWith(`${want} `))?.record ||
    null
  );
}

/**
 * USDA marks a taxon as a synonym by pointing at an accepted symbol that is
 * not its own. Shapes vary across endpoints, so several spellings are checked.
 */
function acceptanceOf(record) {
  const symbol = record.Symbol || record.PlantSymbol || null;
  const accepted =
    record.AcceptedSymbol || record.AcceptedPlantSymbol || record.Accepted || null;
  if (!accepted || !symbol) return { status: "unknown", acceptedSymbol: accepted };
  if (String(accepted).toUpperCase() === String(symbol).toUpperCase()) {
    return { status: "accepted", acceptedSymbol: accepted };
  }
  return { status: "synonym", acceptedSymbol: accepted };
}

/**
 * Compare the catalog's free-text caNative against USDA's CA native status.
 * The catalog uses annotated values ("No (Med)", "Yes (hybrid)"), so only the
 * yes/no polarity is compared, and only when both sides state one.
 */
function compareNative(caNative, usdaNativeStatus) {
  if (!caNative || !usdaNativeStatus) return null;
  const claimsNative = /^(yes|native|some native|near-native)/i.test(caNative.trim());
  // USDA status codes: N/NI = native, I/GP/W = introduced/waif.
  const usdaNative = /\bN\b/.test(usdaNativeStatus) && !/^I\b/.test(usdaNativeStatus);
  if (claimsNative === usdaNative) return null;
  return { catalog: caNative, usda: usdaNativeStatus };
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

function cachePath(key) {
  return path.join(CACHE, `${key.replace(/[^a-z0-9]+/gi, "_").slice(0, 120)}.json`);
}

async function getJson(url, cacheKey) {
  const file = cacheKey ? cachePath(cacheKey) : null;
  if (file && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));

  let lastErr;
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const body = await res.json();
      if (file) {
        fs.mkdirSync(CACHE, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(body));
      }
      return body;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw lastErr;
}

/** PlantSearch wraps each hit as {Text, Plant}; callers want the Plant. */
async function searchPlants(text) {
  const body = await getJson(
    `${BASE}/PlantSearch?searchText=${encodeURIComponent(text)}`,
    `search_${text}`
  );
  if (!Array.isArray(body)) return [];
  return body.map((item) => item.Plant || item).filter(Boolean);
}

/** GetNoxiousByState / GetInvasiveByState need an explicit Content-Length. */
async function statusByState(kind, state) {
  const url = `${BASE}/NoxiousInvasiveSearch/Get${kind}ByState?state=${state}`;
  const file = cachePath(`${kind}_${state}`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": "2" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const body = await res.json();
  const results = body.PlantResults || [];
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(results));
  return results;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    })
  );
  return out;
}

// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const outPath = args.includes("--out") ? args[args.indexOf("--out") + 1] : "usda_crosscheck.json";
  const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;

  const plants = JSON.parse(fs.readFileSync(DATA, "utf8"));

  // One lookup per distinct binomial, not per record: 3,424 plants collapse to
  // far fewer species, and USDA is indexed by taxon.
  const byBinomial = new Map();
  const unresolvable = [];
  for (const p of plants) {
    const bi = toBinomial(p.botanicalName);
    if (!bi) {
      unresolvable.push({ id: p.id, commonName: p.commonName, botanicalName: p.botanicalName });
      continue;
    }
    if (!byBinomial.has(bi.name)) byBinomial.set(bi.name, { ...bi, plants: [] });
    byBinomial.get(bi.name).plants.push(p);
  }

  const targets = [...byBinomial.values()].slice(0, limit);
  console.log(`${plants.length} records -> ${byBinomial.size} distinct taxa (${unresolvable.length} unresolvable)`);

  let noxious = [];
  let invasive = [];
  try {
    [noxious, invasive] = await Promise.all([
      statusByState("Noxious", "CA"),
      statusByState("Invasive", "CA"),
    ]);
    console.log(`CA noxious: ${noxious.length}, CA invasive: ${invasive.length}`);
  } catch (err) {
    console.warn(`WARNING: could not load CA noxious/invasive lists: ${err.message}`);
  }
  const flagged = new Map();
  for (const [list, rows] of [["noxious", noxious], ["invasive", invasive]]) {
    for (const r of rows) {
      const key = normaliseName(r.ScientificName || r.PlantScientificName || "");
      if (!key) continue;
      if (!flagged.has(key)) flagged.set(key, new Set());
      flagged.get(key).add(list);
    }
  }

  const findings = { notFound: [], synonym: [], nativeMismatch: [], listed: [], unresolvable };
  let done = 0;

  await mapLimit(targets, CONCURRENCY, async (target) => {
    let records = [];
    try {
      records = await searchPlants(target.name);
    } catch (err) {
      console.warn(`lookup failed for ${target.name}: ${err.message}`);
      return;
    }
    const match = pickMatch(target.name, records);
    const ids = target.plants.map((p) => p.id);

    if (!match) {
      findings.notFound.push({ binomial: target.name, rank: target.rank, count: ids.length, ids: ids.slice(0, 10) });
    } else {
      const acc = acceptanceOf(match);
      if (acc.status === "synonym") {
        findings.synonym.push({
          binomial: target.name,
          usdaName: stripHtml(match.ScientificName),
          acceptedSymbol: acc.acceptedSymbol,
          count: ids.length,
          ids: ids.slice(0, 10),
        });
      }
      for (const p of target.plants) {
        const mismatch = compareNative(p.caNative, match.NativeStatus || match.NativeStatusCode);
        if (mismatch) {
          findings.nativeMismatch.push({ id: p.id, commonName: p.commonName, binomial: target.name, ...mismatch });
        }
      }
    }

    const lists = flagged.get(normaliseName(target.name));
    if (lists) {
      findings.listed.push({
        binomial: target.name,
        lists: [...lists],
        count: ids.length,
        plants: target.plants.map((p) => ({ id: p.id, commonName: p.commonName })).slice(0, 10),
      });
    }

    done += 1;
    if (done % 100 === 0) console.log(`  ${done}/${targets.length}`);
  });

  const summary = {
    records: plants.length,
    taxaChecked: targets.length,
    notFound: findings.notFound.length,
    synonym: findings.synonym.length,
    nativeMismatch: findings.nativeMismatch.length,
    listedNoxiousOrInvasive: findings.listed.length,
    unresolvable: unresolvable.length,
  };
  fs.writeFileSync(outPath, `${JSON.stringify({ summary, findings }, null, 2)}\n`);
  console.log(summary);
  console.log(`report written to ${outPath}`);
}

module.exports = { stripHtml, toBinomial, normaliseName, pickMatch, acceptanceOf, compareNative };

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
