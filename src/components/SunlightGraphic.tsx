import { Sun } from "lucide-react";

interface SunlightGraphicProps {
  label: string;
  min: number | null;
  max: number | null;
  scaleMax: number;
  unit: string;
  bandLabel?: string | null;
}

export default function SunlightGraphic({ label, min, max, scaleMax, unit, bandLabel }: SunlightGraphicProps) {
  const hasData = min != null || max != null;
  const lo = min ?? 0;
  const hi = max ?? min ?? 0;

  const cx = 100;
  const cy = 90;
  const r = 75;

  // Calculate coordinates for a given value
  const getCoords = (val: number) => {
    // Map value to angle: 0 -> -PI (left), scaleMax -> 0 (right)
    const angle = Math.PI * (val / scaleMax) - Math.PI;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const start = getCoords(lo);
  const end = getCoords(hi);

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {hasData ? `${lo}${hi !== lo ? `–${hi}` : ""} ${unit}` : "no data"}
        </span>
      </div>
      <div className="relative w-full overflow-hidden flex justify-center py-2">
        <svg viewBox="0 0 200 110" className="w-full max-w-[250px] overflow-visible">
        {/* Full background arc (dashed) */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="4"
          strokeDasharray="6 4"
          strokeLinecap="round"
        />

        {hasData && (
          <>
            {/* Range arc */}
            {lo !== hi && (
              <path
                d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
                fill="none"
                stroke="#fbbf24" // amber-400
                strokeWidth="6"
                strokeLinecap="round"
              />
            )}

            {/* Min Sun (transparent) */}
            {lo !== hi && (
              <g transform={`translate(${start.x - 12}, ${start.y - 12})`}>
                <Sun className="text-amber-500 opacity-40" size={24} />
                <text x="-4" y="16" fontSize="12" fill="#d97706" textAnchor="end" fontWeight="600">{lo}hr</text>
              </g>
            )}

            {/* Max / Single Sun (opaque) */}
            <g transform={`translate(${end.x - 14}, ${end.y - 14})`}>
              <Sun className="text-amber-500 fill-amber-100 drop-shadow-sm" size={28} />
              <text x="32" y="18" fontSize="12" fill="#d97706" textAnchor="start" fontWeight="600">{hi}hr</text>
            </g>
          </>
        )}

        {/* Generic Green Plant at center bottom */}
        <g transform={`translate(${cx - 20}, ${cy - 35})`}>
          <path
            d="M 20 40 C 20 25, 10 20, 5 10 C 15 15, 20 25, 20 40 Z"
            fill="#4ade80"
          />
          <path
            d="M 20 40 C 20 20, 30 15, 35 5 C 25 10, 20 20, 20 40 Z"
            fill="#22c55e"
          />
          <path
            d="M 20 40 C 20 30, 12 25, 8 18 C 15 22, 20 30, 20 40 Z"
            fill="#16a34a"
          />
        </g>
      </svg>
      </div>
      {bandLabel && <div className="mt-1 text-center text-xs font-medium text-klr-700">{bandLabel}</div>}
    </div>
  );
}
