#!/usr/bin/env node
/*
 * Offline tests for the pure helpers in usda_crosscheck.cjs. These cover the
 * parsing that decides which name is sent to USDA and how a response is
 * matched -- the parts that are wrong silently, and the only parts that can be
 * exercised without network access to plantsservices.sc.egov.usda.gov.
 */
const assert = require("assert");
const {
  stripHtml,
  toBinomial,
  normaliseName,
  pickMatch,
  acceptanceOf,
  compareNative,
} = require("./usda_crosscheck.cjs");

let passed = 0;
function check(label, fn) {
  try {
    fn();
    passed += 1;
  } catch (err) {
    console.error(`FAIL: ${label}\n  ${err.message}`);
    process.exitCode = 1;
  }
}

const bi = (s) => toBinomial(s)?.name ?? null;

check("strips USDA italic markup", () => {
  assert.equal(stripHtml("<i>Quercus agrifolia</i> Née"), "Quercus agrifolia Née");
});

check("plain binomial passes through", () => {
  assert.equal(bi("Ceanothus hearstiorum"), "Ceanothus hearstiorum");
});

check("drops cultivar epithet", () => {
  assert.equal(bi("Sedum spurium 'Tricolor'"), "Sedum spurium");
  assert.equal(bi("Ceanothus gloriosus 'Heart's Desire'"), "Ceanothus gloriosus");
});

check("keeps only the first of several listed names", () => {
  assert.equal(bi("Chrysanthemum paludosum, Leucanthemum paludosum"), "Chrysanthemum paludosum");
  assert.equal(bi("Aloe barberae, A. bainesii"), "Aloe barberae");
});

check("strips patent numbers and trademark marks", () => {
  assert.equal(bi("Leucadendron 'Hawaii Sunrise' PP 31,705"), "Leucadendron");
  assert.equal(bi("Cyclamen Latinia® Series"), "Cyclamen");
});

check("handles hybrid markers", () => {
  assert.equal(bi("Salvia x jamensis"), "Salvia jamensis");
  assert.equal(bi("Zinnia x 'Profusion Series"), "Zinnia");
});

check("genus-only name reports genus rank", () => {
  assert.deepEqual(toBinomial("Impatiens"), { genus: "Impatiens", name: "Impatiens", rank: "genus" });
});

check("unusable names return null rather than a guess", () => {
  assert.equal(toBinomial(""), null);
  assert.equal(toBinomial(null), null);
  assert.equal(toBinomial("A. bainesii"), null); // abbreviated genus is unrecoverable
});

check("matches USDA name carrying a taxonomic author", () => {
  const records = [
    { Symbol: "QUAG", ScientificName: "<i>Quercus agrifolia</i> Née" },
    { Symbol: "QUAG2", ScientificName: "<i>Quercus agrifolia</i> var. <i>oxyadenia</i>" },
  ];
  assert.equal(pickMatch("Quercus agrifolia", records).Symbol, "QUAG");
});

check("no false match on a different species", () => {
  const records = [{ Symbol: "QUAB", ScientificName: "<i>Quercus alba</i> L." }];
  assert.equal(pickMatch("Quercus agrifolia", records), null);
});

check("accepted vs synonym", () => {
  assert.equal(acceptanceOf({ Symbol: "QUAG", AcceptedSymbol: "QUAG" }).status, "accepted");
  assert.equal(acceptanceOf({ Symbol: "GASP", AcceptedSymbol: "GAMSP" }).status, "synonym");
  assert.equal(acceptanceOf({ Symbol: "QUAG" }).status, "unknown");
});

check("native comparison only fires on real disagreement", () => {
  assert.equal(compareNative("Yes", "N"), null);
  assert.equal(compareNative("No (Med)", "I"), null);
  assert.equal(compareNative(null, "N"), null); // catalog silent -> no finding
  assert.equal(compareNative("Yes", null), null); // USDA silent -> no finding
  assert.ok(compareNative("Yes", "I")); // catalog says native, USDA says introduced
});

check("normalisation folds case, markup and hybrid markers", () => {
  assert.equal(normaliseName("<i>Salvia</i> × <i>Jamensis</i>"), "salvia jamensis");
});

console.log(`${passed} checks passed`);
