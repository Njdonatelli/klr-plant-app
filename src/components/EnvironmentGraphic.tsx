import { Sun } from "lucide-react";
import { metersToFeetLabel } from "../lib/units";

interface EnvironmentGraphicProps {
  lightMin: number | null;
  lightMax: number | null;
  lightScaleMax: number;
  lightBandLabel?: string | null;

  waterMin: number | null;
  waterMax: number | null;
  waterScaleMax: number;
  waterBandLabel?: string | null;

  heightMinM: number | null;
  heightMaxM: number | null;
  widthMinM: number | null;
  widthMaxM: number | null;
}

export default function EnvironmentGraphic({
  lightMin,
  lightMax,
  lightScaleMax,
  lightBandLabel,
  waterMin,
  waterMax,
  waterScaleMax: passedWaterScaleMax,
  waterBandLabel,
  heightMinM,
  heightMaxM,
  widthMinM,
  widthMaxM,
}: EnvironmentGraphicProps) {
  const hasLight = lightMin != null || lightMax != null;
  const lLo = lightMin ?? 0;
  const lHi = lightMax ?? lightMin ?? 0;

  const hasWater = waterMin != null || waterMax != null;
  const wLo = waterMin ?? 0;
  const wHi = waterMax ?? waterMin ?? 0;
  const waterScaleMax = Math.max(passedWaterScaleMax, wHi + 1);

  // --- Size Logic ---
  const actualHMin = heightMinM ?? 0;
  const actualHMax = heightMaxM ?? heightMinM ?? 0;
  const actualWMin = widthMinM ?? 0;
  const actualWMax = widthMaxM ?? widthMinM ?? 0;

  const avgH = (actualHMin + actualHMax) / 2;
  const avgW = (actualWMin + actualWMax) / 2;

  const hasSize = avgH > 0 && avgW > 0;

  // SVG Geometry
  const cx = 170;
  const cy = 130;
  const r = 110; // Increased sun arc radius

  // Scale plant relative to area under the sun arc.
  let domainM = Math.max(2.0, avgH * 1.4, avgW * 1.4);
  let pxPerM = 80 / domainM;

  // Ensure 6ft marker doesn't hit sun arc (r=110)
  // Text is at cy - 1.8 * pxPerM - 12
  // Arc is at cy - sqrt(110^2 - dx^2) where dx = (avgW * pxPerM) / 2 + 25
  while (hasSize) {
    const dx = (avgW * pxPerM) / 2 + 25;
    if (dx >= 100) { // Too wide for arc
      domainM += 0.5;
      pxPerM = 80 / domainM;
      continue;
    }
    const arcHeightAtDx = Math.sqrt(r * r - dx * dx);
    const textHeight = 1.8 * pxPerM + 15;
    if (arcHeightAtDx < textHeight) {
      domainM += 0.5;
      pxPerM = 80 / domainM;
    } else {
      break;
    }
  }

  // --- Sunlight Logic ---
  const getSunCoords = (val: number, radius = r) => {
    const angle = Math.PI * (val / lightScaleMax) - Math.PI;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  const sunStart = getSunCoords(lLo);
  const sunEnd = getSunCoords(lHi);
  const sunStartText = getSunCoords(lLo, r + 22);
  const sunEndText = getSunCoords(lHi, r + 26);

  // --- Water Logic ---
  const soilW = Math.max(80, (avgW * pxPerM) + 60); // Condense to fit around plant
  const soilX = cx - soilW / 2;
  const soilH = 90;
  
  const getDepth = (val: number) => {
    return Math.min(soilH, (val / waterScaleMax) * soilH);
  };

  const minDepth = getDepth(wLo);
  const maxDepth = getDepth(wHi);

  return (
    <div className="flex flex-col">
      {/* Combined Graphic */}
      <div className="relative w-full overflow-hidden flex justify-center pt-4 sm:pt-6 pb-2">
        <svg viewBox="0 -15 340 265" className="w-full max-w-[400px] overflow-visible">
          {/* --- TOP HALF (Sun) --- */}
          {/* Full background arc (dashed) */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="4"
            strokeDasharray="6 4"
            strokeLinecap="round"
          />

          {hasLight && (
            <>
              {/* Base progress arc */}
              {lHi > 0 && (
                <path
                  d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${sunEnd.x} ${sunEnd.y}`}
                  fill="none"
                  stroke="#fcd34d"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              )}

              {/* Highlight range arc */}
              {lLo !== lHi && (
                <path
                  d={`M ${sunStart.x} ${sunStart.y} A ${r} ${r} 0 0 1 ${sunEnd.x} ${sunEnd.y}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              )}

              {/* White circle hour marks (painted over the arcs) */}
              {Array.from({ length: lightScaleMax + 1 }).map((_, i) => {
                const coords = getSunCoords(i);
                return <circle key={i} cx={coords.x} cy={coords.y} r="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" opacity={0.5} />;
              })}

              {/* Min Sun */}
              {lLo !== lHi && (
                <>
                  <g transform={`translate(${sunStart.x - 12}, ${sunStart.y - 12})`}>
                    <Sun className="text-amber-300 fill-amber-50 drop-shadow-sm" size={24} />
                  </g>
                  <text x={sunStartText.x} y={sunStartText.y} dy="0.32em" fontSize="12" fill="#d97706" textAnchor="middle" fontWeight="600">
                    {lLo}
                  </text>
                </>
              )}

              {/* Max / Single Sun */}
              <g transform={`translate(${sunEnd.x - 14}, ${sunEnd.y - 14})`}>
                <Sun className="text-amber-500 fill-amber-100 drop-shadow-sm" size={28} />
              </g>
              <text x={sunEndText.x} y={sunEndText.y} dy="0.32em" fontSize="12" fill="#d97706" textAnchor="middle" fontWeight="600">
                {lHi}
              </text>
            </>
          )}

          {/* --- MIDDLE (Plant & Surface) --- */}
          <line x1={soilX - 10} y1={cy} x2={soilX + soilW + 10} y2={cy} stroke="#a8a29e" strokeWidth="2" />
          
          {hasSize ? (
            <>
              {/* Plant Shape (Rounded Rectangle) */}
              <rect
                x={cx - (avgW * pxPerM) / 2}
                y={cy - avgH * pxPerM}
                width={avgW * pxPerM}
                height={avgH * pxPerM}
                rx={Math.min(8, (avgW * pxPerM) / 3, (avgH * pxPerM) / 3)}
                fill="#bbf7d0"
                stroke="#22c55e"
                strokeWidth="2"
                opacity={0.8}
              />

              {/* --- Height Callout (left side, always readable) --- */}
              {(() => {
                const plantLeft = cx - (avgW * pxPerM) / 2;
                const plantTop = cy - avgH * pxPerM;
                const labelX = 30; // fixed left position
                const labelY = (plantTop + cy) / 2; // vertically centered on plant
                return (
                  <g>
                    {/* Leader line (stops before text) */}
                    <line x1={plantLeft - 6} y1={labelY} x2={labelX + 20} y2={labelY} stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="3 2" opacity={0.5} />
                    {/* Label */}
                    <text x={labelX} y={labelY - 6} fontSize="11" fill="#16a34a" textAnchor="middle" fontWeight="600">
                      {metersToFeetLabel(avgH, avgH)}
                    </text>
                    <text x={labelX} y={labelY + 8} fontSize="9" fill="#94a3b8" textAnchor="middle">
                      height
                    </text>
                  </g>
                );
              })()}

              {/* --- Width Callout (above plant, mirroring height style) --- */}
              {(() => {
                const plantLeft = cx - (avgW * pxPerM) / 2;
                const plantRight = cx + (avgW * pxPerM) / 2;
                const plantTop = cy - avgH * pxPerM;
                const labelY = plantTop - 28; // fixed position above plant
                return (
                  <g>
                    {/* Dashed leader line from line midpoint up to label (stops below text) */}
                    <line x1={cx} y1={plantTop - 6} x2={cx} y2={labelY + 14} stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="3 2" opacity={0.5} />
                    {/* Label: value + subtext */}
                    <text x={cx} y={labelY - 4} fontSize="11" fill="#16a34a" textAnchor="middle" fontWeight="600">
                      {metersToFeetLabel(avgW, avgW)}
                    </text>
                    <text x={cx} y={labelY + 10} fontSize="9" fill="#94a3b8" textAnchor="middle">
                      width
                    </text>
                  </g>
                );
              })()}

              {/* Human Scale Reference (1.8m ~ 6ft) */}
              {(() => {
                const refX = cx + Math.max(35, (avgW * pxPerM) / 2 + 30);
                const refTop = cy - 1.8 * pxPerM;
                return (
                  <g>
                    <line x1={refX} y1={cy} x2={refX} y2={refTop} stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" opacity={0.4} />
                    <circle cx={refX} cy={refTop} r="3.5" fill="#94a3b8" opacity={0.4} />
                    <text x={refX - 6} y={refTop + 3} fontSize="9" fill="#94a3b8" textAnchor="end" fontWeight="500">6 ft</text>
                  </g>
                );
              })()}
            </>
          ) : (
            <g transform={`translate(${cx - 15}, ${cy - 30})`}>
              <path d="M 15 30 C 15 18, 7 14, 4 7 C 11 11, 15 18, 15 30 Z" fill="#4ade80" />
              <path d="M 15 30 C 15 14, 23 11, 26 4 C 19 7, 15 14, 15 30 Z" fill="#22c55e" />
              <path d="M 15 30 C 15 22, 9 18, 6 13 C 11 16, 15 22, 15 30 Z" fill="#16a34a" />
            </g>
          )}

          {/* --- BOTTOM HALF (Water & Soil) --- */}
          <rect x={soilX} y={cy} width={soilW} height={soilH} rx="8" fill="#d6d3d1" />

          {/* Soil Depth Scale Ticks (Left side) */}
          {Array.from({ length: waterScaleMax }).map((_, i) => {
            const t = i + 1;
            const d = getDepth(t);
            return (
              <g key={t}>
                <line x1={soilX - 8} y1={cy + d} x2={soilX} y2={cy + d} stroke="#a8a29e" strokeWidth="1" />
                <text x={soilX - 12} y={cy + d} dy="0.32em" fontSize="10" fill="#78716c" textAnchor="end">{t}"</text>
              </g>
            );
          })}

          {hasWater && (
            <>
              {/* Max Water Penetration */}
              {wLo !== wHi && (
                <rect x={soilX} y={cy} width={soilW} height={maxDepth} rx="8" fill="#bae6fd" opacity={0.6} />
              )}
              
              {/* Min Water Penetration */}
              <rect x={soilX} y={cy} width={soilW} height={minDepth} rx="8" fill="#38bdf8" opacity={0.8} />

              {/* Standard Depth Reference (1 inch) */}
              {waterScaleMax >= 1 && (() => {
                const stdDepth = getDepth(1);
                return (
                  <g>
                    <line
                      x1={soilX + 4}
                      y1={cy + stdDepth}
                      x2={soilX + soilW - 4}
                      y2={cy + stdDepth}
                      stroke="#0369a1"
                      strokeWidth="1"
                      strokeDasharray="4 3"
                      opacity={0.6}
                    />
                  </g>
                );
              })()}
            </>
          )}
        </svg>
      </div>

      {/* Standardized Data Footer */}
      <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4 border-t border-gray-100 pt-4 sm:pt-5 px-1 sm:px-2">
        <div>
          <div className="text-sm font-semibold text-gray-700">Light</div>
          <div className="mt-1 text-xs font-medium text-amber-600">{lightBandLabel || "Unknown"}</div>
          <div className="mt-0.5 text-xs text-gray-500">
            {hasLight ? `${lLo}${lHi !== lLo ? `–${lHi}` : ""} hrs/day` : "no data"}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-700">Water</div>
          <div className="mt-1 text-xs font-medium text-sky-600">{waterBandLabel || "Unknown"}</div>
          <div className="mt-0.5 text-xs text-gray-500">
            {hasWater ? `${wLo}${wHi !== wLo ? `–${wHi}` : ""} in/wk` : "no data"}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-700">Size (Avg)</div>
          <div className="mt-1 text-xs font-medium text-green-600">Height x Width</div>
          <div className="mt-0.5 text-xs text-gray-500">
            {hasSize ? `${metersToFeetLabel(avgH, avgH)} x ${metersToFeetLabel(avgW, avgW)}` : "no data"}
          </div>
        </div>
      </div>
    </div>
  );
}
