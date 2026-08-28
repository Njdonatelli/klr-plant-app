import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sprout,
  MapPinCheck,
  Leaf,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Grid3x3,
  Ruler,
  Shapes,
  X,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { CATEGORY_LABELS } from "../types";
import {
  isLivingPlant,
  isCaNative,
  matchesWaterBand,
  waterLightMatrix,
  heightClassCounts,
  categoryCounts,
  suitabilityCounts,
} from "../lib/exploreStats";

/* Sequential ramp (KLR green, light -> dark) for the heatmap. Zero gets a
   neutral so "no plants" never reads as a low value. */
const HEAT_RAMP = ["#dfeade", "#c1d8c4", "#9cc0a1", "#6fa177", "#4d8456", "#2f6b3a", "#25532d"];
const SUIT_COLORS = { suited: "#28713d", marginal: "#d97706", unknown: "#64748b" };

function heatStyle(count: number, max: number): { background: string; color: string } {
  if (count === 0 || max === 0) return { background: "#f5f5f4", color: "#a8a29e" };
  const t = Math.sqrt(count / max); // sqrt keeps sparse cells readable next to dense ones
  const idx = Math.min(HEAT_RAMP.length - 1, Math.floor(t * HEAT_RAMP.length));
  return { background: HEAT_RAMP[idx], color: idx >= 4 ? "#ffffff" : "#17331b" };
}

const LIGHT_SHORT: Record<string, string> = {
  "Shade": "Shade",
  "Partial Shade": "Pt. Shade",
  "Filtered Sun": "Filt. Sun",
  "Partial Sun": "Pt. Sun",
  "Full Sun": "Full Sun",
};

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  to,
}: {
  icon: typeof Sprout;
  label: string;
  value: number;
  sub: string;
  to?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-klr-600" />
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="mt-1.5 text-2xl font-bold text-gray-900 sm:text-3xl">
        {value.toLocaleString()}
      </div>
      <div className="mt-0.5 text-[11px] text-gray-400">{sub}</div>
    </>
  );
  const cls = "card block p-3.5 sm:p-4";
  return to ? (
    <Link to={to} className={`${cls} transition hover:border-klr-300 hover:shadow-card-hover`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: typeof Sprout;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-4 sm:p-5 ${className ?? ""}`}>
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4 text-klr-600" />
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <p className="mb-4 text-xs text-gray-500">{subtitle}</p>
      {children}
    </section>
  );
}

/** Horizontal bar row: thin mark, 4px rounded data-end, count at the tip in ink. */
function BarRow({
  label,
  sub,
  count,
  max,
  to,
  thin,
}: {
  label: string;
  sub?: string;
  count: number;
  max: number;
  to: string;
  thin?: boolean;
}) {
  const pct = max === 0 ? 0 : (count / max) * 100;
  return (
    <Link
      to={to}
      className="group block rounded-lg px-2 py-1.5 transition hover:bg-klr-50/70"
      aria-label={`${label}: ${count.toLocaleString()} plants — view in catalog`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-medium text-gray-700 group-hover:text-klr-800">
          {label}
          {sub && <span className="ml-1.5 font-normal text-gray-400">{sub}</span>}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className={`${thin ? "h-2.5" : "h-4"} flex-1 overflow-hidden`}>
          <div
            className="h-full rounded-r bg-klr-600 transition group-hover:bg-klr-500"
            style={{ width: `${Math.max(pct, count > 0 ? 1 : 0)}%` }}
          />
        </div>
        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-gray-600">
          {count.toLocaleString()}
        </span>
      </div>
    </Link>
  );
}

export default function Explore() {
  const allPlants = useStore((s) => s.plants);
  const [category, setCategory] = useState("");
  const [nativeOnly, setNativeOnly] = useState(false);

  const living = useMemo(() => allPlants.filter(isLivingPlant), [allPlants]);
  const categories = useMemo(
    () => [...new Set(living.map((p) => p.category))].filter(Boolean).sort(),
    [living]
  );
  // The shipped baseline has no CA-native flags; the control only appears once
  // imported/edited data actually carries them.
  const hasNativeData = useMemo(() => living.some(isCaNative), [living]);

  // One filter row scopes every chart and tile below it.
  const scoped = useMemo(
    () =>
      living.filter((p) => {
        if (category && p.category !== category) return false;
        if (nativeOnly && !isCaNative(p)) return false;
        return true;
      }),
    [living, category, nativeOnly]
  );

  const matrix = useMemo(() => waterLightMatrix(scoped), [scoped]);
  const heights = useMemo(() => heightClassCounts(scoped), [scoped]);
  const cats = useMemo(() => categoryCounts(scoped), [scoped]);
  const suits = useMemo(() => suitabilityCounts(scoped), [scoped]);

  const suitedCount = suits.suited;
  const nativeCount = useMemo(() => scoped.filter(isCaNative).length, [scoped]);
  const lowWaterCount = useMemo(
    () => scoped.filter((p) => matchesWaterBand(p, "Low")).length,
    [scoped]
  );
  const maxHeightCount = Math.max(...heights.map((h) => h.count), 0);
  const maxCatCount = Math.max(...cats.map((c) => c.count), 0);
  const suitTotal = scoped.length;

  /**
   * Deep link into the catalog carrying the page-level scope plus chart-specific
   * filters. Always sets plants=1 so the landing list matches chart counts, which
   * exclude non-plant materials.
   */
  function catalogLink(extra: Record<string, string>): string {
    const params = new URLSearchParams();
    params.set("plants", "1");
    if (category) params.set("category", category);
    if (nativeOnly) params.set("native", "1");
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
    return `/?${params.toString()}`;
  }

  const filtersActive = category !== "" || nativeOnly;

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="mb-4 sm:mb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-klr-900 sm:text-3xl">
          Explore the Database
        </h1>
        <p className="mt-0.5 max-w-2xl text-sm text-gray-500">
          Profile the catalog against a client's site — match water and light conditions, size
          roles, and San Diego fit. Every chart element opens the matching plants in the catalog.
        </p>
      </div>

      {/* Filter row — scopes everything below */}
      <div className="card mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input w-auto min-w-40 flex-1 sm:flex-none"
        >
          <option value="">All plant categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] ?? c}
            </option>
          ))}
        </select>
        {hasNativeData && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={nativeOnly}
              onChange={(e) => setNativeOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-klr-600 focus:ring-klr-500"
            />
            CA native only
          </label>
        )}
        {filtersActive && (
          <button
            onClick={() => {
              setCategory("");
              setNativeOnly(false);
            }}
            className="flex items-center gap-1 text-sm font-medium text-klr-700 hover:underline"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          Charting{" "}
          <span className="font-semibold text-gray-600">{scoped.length.toLocaleString()}</span>{" "}
          living plants (materials excluded)
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          icon={Sprout}
          label="Plant varieties"
          value={scoped.length}
          sub="in the current scope"
          to={catalogLink({})}
        />
        <StatTile
          icon={MapPinCheck}
          label="San Diego suited"
          value={suitedCount}
          sub={
            suitTotal > 0 ? `${Math.round((suitedCount / suitTotal) * 100)}% of scope` : "no plants"
          }
          to={catalogLink({ sd: "1" })}
        />
        {hasNativeData ? (
          <StatTile
            icon={Leaf}
            label="California natives"
            value={nativeCount}
            sub="habitat & low-water value"
            to={catalogLink({ native: "1" })}
          />
        ) : (
          <StatTile
            icon={Shapes}
            label="Plant categories"
            value={cats.length}
            sub="groups represented in scope"
          />
        )}
        <StatTile
          icon={Droplets}
          label="Low-water picks"
          value={lowWaterCount}
          sub="≤ ½ in per week"
          to={catalogLink({ water: "Low" })}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Site conditions heatmap */}
        <SectionCard
          icon={Grid3x3}
          title="Match a site's conditions"
          subtitle="Plants per water × light combination. Darker green = more choices. Tap a cell to open those plants — adaptable plants count in every condition they tolerate."
          className="lg:col-span-2"
        >
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[540px] gap-0.5"
              style={{ gridTemplateColumns: "5.5rem repeat(5, minmax(0, 1fr))" }}
            >
              {/* Header row */}
              <div />
              {matrix.lightBands.map((l) => (
                <div
                  key={l}
                  className="pb-1 text-center text-[11px] font-semibold leading-tight text-gray-600"
                >
                  {LIGHT_SHORT[l] ?? l}
                </div>
              ))}
              {/* Body rows */}
              {matrix.cells.map((row, ri) => (
                <div key={matrix.waterBands[ri]} className="contents">
                  <div className="flex flex-col justify-center pr-2 text-right">
                    <span className="text-[11px] font-semibold leading-tight text-gray-600">
                      {matrix.waterBands[ri]} water
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {ri === 0 ? "≤ ½ in/wk" : ri === 1 ? "½–1 in/wk" : "1+ in/wk"}
                    </span>
                  </div>
                  {row.map((cell) => {
                    const style = heatStyle(cell.count, matrix.maxCount);
                    const label = `${cell.water} water + ${cell.light}: ${cell.count.toLocaleString()} plants`;
                    return cell.count > 0 ? (
                      <Link
                        key={cell.light}
                        to={catalogLink({ water: cell.water, light: cell.light })}
                        title={`${label} — view in catalog`}
                        aria-label={`${label} — view in catalog`}
                        className="flex h-12 items-center justify-center rounded-md text-sm font-semibold tabular-nums transition hover:brightness-110 hover:saturate-150 sm:h-14"
                        style={style}
                      >
                        {cell.count.toLocaleString()}
                      </Link>
                    ) : (
                      <div
                        key={cell.light}
                        title={label}
                        className="flex h-12 items-center justify-center rounded-md text-sm font-medium tabular-nums sm:h-14"
                        style={style}
                      >
                        0
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
            <span>Fewer</span>
            <div className="flex gap-0.5">
              {HEAT_RAMP.map((c) => (
                <span key={c} className="h-2.5 w-5 rounded-sm" style={{ background: c }} />
              ))}
            </div>
            <span>More choices</span>
          </div>
        </SectionCard>

        {/* Height roles */}
        <SectionCard
          icon={Ruler}
          title="Mature size roles"
          subtitle="Plants by landscape role, classified by mature height. Tap a bar to browse that size class."
        >
          <div className="-mx-2 space-y-0.5">
            {heights.map(({ cls, count }) => (
              <BarRow
                key={cls.label}
                label={cls.label}
                sub={cls.range}
                count={count}
                max={maxHeightCount}
                to={catalogLink({
                  ...(cls.minFt > 0 ? { hmin: String(cls.minFt) } : {}),
                  ...(cls.maxFt != null ? { hmax: String(cls.maxFt) } : {}),
                })}
              />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">
            Plants without recorded height data are not shown.
          </p>
        </SectionCard>

        {/* SD suitability */}
        <SectionCard
          icon={MapPinCheck}
          title="San Diego County fit"
          subtitle="Zone data vs. KLR's coastal / inland-valley service area (USDA 9–10, Sunset 18–24)."
        >
          {/* Stacked bar with 2px surface gaps between segments */}
          <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-lg">
            {(["suited", "marginal", "unknown"] as const).map((k) =>
              suits[k] > 0 ? (
                <div
                  key={k}
                  className="h-full first:rounded-l-lg last:rounded-r-lg"
                  style={{
                    width: `${(suits[k] / Math.max(suitTotal, 1)) * 100}%`,
                    background: SUIT_COLORS[k],
                  }}
                />
              ) : null
            )}
          </div>
          <div className="mt-4 space-y-2.5">
            {(
              [
                {
                  key: "suited" as const,
                  icon: CheckCircle2,
                  label: "Suited — zones overlap SD County",
                  link: catalogLink({ sd: "1" }),
                },
                {
                  key: "marginal" as const,
                  icon: AlertTriangle,
                  label: "Marginal — verify site conditions",
                  link: null,
                },
                {
                  key: "unknown" as const,
                  icon: HelpCircle,
                  label: "No zone data on file",
                  link: null,
                },
              ]
            ).map(({ key, icon: Icon, label, link }) => {
              const pct = suitTotal > 0 ? Math.round((suits[key] / suitTotal) * 100) : 0;
              const row = (
                <div className="flex items-center gap-2.5 text-sm">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: SUIT_COLORS[key] }} />
                  <span className="flex-1 text-gray-700">{label}</span>
                  <span className="tabular-nums font-semibold text-gray-800">
                    {suits[key].toLocaleString()}
                  </span>
                  <span className="w-9 text-right text-xs tabular-nums text-gray-400">{pct}%</span>
                </div>
              );
              return link ? (
                <Link key={key} to={link} className="block rounded-md px-1 py-0.5 transition hover:bg-klr-50/70">
                  {row}
                </Link>
              ) : (
                <div key={key} className="px-1 py-0.5">
                  {row}
                </div>
              );
            })}
          </div>
          <p className="mt-4 border-t border-gray-100 pt-3 text-[11px] leading-relaxed text-gray-400">
            "Marginal" means recorded zones don't overlap the default service-area band — it can
            still work for high-elevation east-county sites (Julian, Mt. Laguna). Verify against
            the project site before ruling a plant in or out.
          </p>
        </SectionCard>

        {/* Category breakdown */}
        <SectionCard
          icon={Shapes}
          title="Catalog by category"
          subtitle="Where the catalog is deep and where it's thin. Tap a category to browse it."
          className="lg:col-span-2"
        >
          <div className="-mx-2 gap-x-6 md:columns-2" style={{ columnFill: "balance" }}>
            {cats.map(({ category: c, count }) => (
              <div key={c} className="break-inside-avoid">
                <BarRow
                  label={CATEGORY_LABELS[c] ?? c}
                  count={count}
                  max={maxCatCount}
                  to={catalogLink({ category: c })}
                  thin
                />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
