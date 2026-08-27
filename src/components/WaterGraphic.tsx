interface WaterGraphicProps {
  label: string;
  min: number | null;
  max: number | null;
  scaleMax: number;
  unit: string;
  bandLabel?: string | null;
}

export default function WaterGraphic({ label, min, max, scaleMax, unit, bandLabel }: WaterGraphicProps) {
  const hasData = min != null || max != null;
  const lo = min ?? 0;
  const hi = max ?? min ?? 0;

  const w = 120;
  const h = 120;
  const surfaceY = 30;
  const soilH = h - surfaceY; // 90

  const getDepth = (val: number) => {
    return Math.min(soilH, (val / scaleMax) * soilH);
  };

  const minDepth = getDepth(lo);
  const maxDepth = getDepth(hi);

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {hasData ? `${lo}${hi !== lo ? `–${hi}` : ""} ${unit}` : "no data"}
        </span>
      </div>
      <div className="relative w-full overflow-hidden flex justify-center py-2">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[150px] overflow-visible">
        {/* Soil Background */}
        <rect
          x="10"
          y={surfaceY}
          width={w - 20}
          height={soilH}
          rx="8"
          fill="#d6d3d1" // stone-300
        />

        {hasData && (
          <>
            {/* Max Water Penetration */}
            {lo !== hi && (
              <rect
                x="10"
                y={surfaceY}
                width={w - 20}
                height={maxDepth}
                rx="8"
                fill="#bae6fd" // sky-200
                opacity={0.6}
              />
            )}
            
            {/* Min Water Penetration */}
            <rect
              x="10"
              y={surfaceY}
              width={w - 20}
              height={minDepth}
              rx="8"
              fill="#38bdf8" // sky-400
              opacity={0.8}
            />

            {/* Depth Markers */}
            <line
              x1="5"
              y1={surfaceY + minDepth}
              x2="25"
              y2={surfaceY + minDepth}
              stroke="#0284c7"
              strokeWidth="2"
              strokeDasharray="2 2"
            />
            <text x="30" y={surfaceY + minDepth + 4} fontSize="12" fill="#0284c7" fontWeight="600">{lo}</text>
            
            {lo !== hi && (
              <>
                <line
                  x1="5"
                  y1={surfaceY + maxDepth}
                  x2="25"
                  y2={surfaceY + maxDepth}
                  stroke="#0284c7"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                  opacity={0.6}
                />
                <text x="30" y={surfaceY + maxDepth + 4} fontSize="12" fill="#0284c7" fontWeight="600" opacity={0.6}>{hi}</text>
              </>
            )}
          </>
        )}

        {/* Surface Line */}
        <line x1="0" y1={surfaceY} x2={w} y2={surfaceY} stroke="#a8a29e" strokeWidth="2" />

        {/* Small Generic Plant */}
        <g transform={`translate(${w / 2 - 12}, ${surfaceY - 25})`}>
          <path
            d="M 12 25 C 12 15, 6 12, 3 6 C 9 9, 12 15, 12 25 Z"
            fill="#4ade80"
          />
          <path
            d="M 12 25 C 12 12, 18 9, 21 3 C 15 6, 12 12, 12 25 Z"
            fill="#22c55e"
          />
          <path
            d="M 12 25 C 12 18, 7 15, 5 11 C 9 13, 12 18, 12 25 Z"
            fill="#16a34a"
          />
        </g>
      </svg>
      </div>
      {bandLabel && <div className="mt-1 text-center text-xs font-medium text-klr-700">{bandLabel}</div>}
    </div>
  );
}
