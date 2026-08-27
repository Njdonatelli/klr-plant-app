import { metersToFeetLabel } from "../lib/units";

const M_TO_FT = 3.28084;

interface Props {
  heightMinM: number | null;
  heightMaxM: number | null;
  widthMinM: number | null;
  widthMaxM: number | null;
}

export default function PlantSizeGraphic({ heightMinM, heightMaxM, widthMinM, widthMaxM }: Props) {
  const hMin = heightMinM != null ? heightMinM * M_TO_FT : null;
  const hMax = heightMaxM != null ? heightMaxM * M_TO_FT : hMin;
  const wMin = widthMinM != null ? widthMinM * M_TO_FT : null;
  const wMax = widthMaxM != null ? widthMaxM * M_TO_FT : wMin;

  if (hMax == null && wMax == null) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-400">
        No mature size data on file for this plant
      </div>
    );
  }

  // Define values, defaulting to 0 if missing for charting logic
  const actualHMin = hMin ?? 0;
  const actualHMax = hMax ?? 0;
  const actualWMin = wMin ?? 0;
  const actualWMax = wMax ?? 0;

  const dataMax = Math.max(actualHMax, actualWMax);
  const showFenceRef = dataMax > 2.5;
  const rawDomain = (showFenceRef ? Math.max(dataMax, 6.5) : dataMax) * 1.2;
  const step = rawDomain <= 3 ? 0.25 : rawDomain <= 10 ? 1 : 5;
  const maxDomain = Math.ceil(rawDomain / step) * step;

  // Chart dimensions
  const svgSize = 250;
  const padLeft = 30;
  const padBottom = 30;
  const padTop = 10;
  const padRight = 10;
  
  const chartW = svgSize - padLeft - padRight;
  const chartH = svgSize - padTop - padBottom;
  const originX = padLeft;
  const originY = svgSize - padBottom;
  
  const pxPerFt = chartW / maxDomain; // Since X and Y share the same domain and physical size

  // Generate grid ticks
  const ticks = [];
  for (let t = 0; t <= maxDomain; t += step) {
    ticks.push(t);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-[300px] aspect-square relative">
        <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="w-full h-full overflow-visible">
          {/* Grid lines and Ticks */}
          {ticks.map((t) => {
            const x = originX + t * pxPerFt;
            const y = originY - t * pxPerFt;
            const label = Number.isInteger(t) ? `${t}` : t.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
            return (
              <g key={t}>
                {/* Vertical Grid / X Axis Ticks */}
                <line x1={x} y1={originY} x2={x} y2={padTop} stroke="#f1f5f9" strokeWidth="1" />
                <text x={x} y={originY + 15} fontSize="10" fill="#64748b" textAnchor="middle">{label}</text>
                
                {/* Horizontal Grid / Y Axis Ticks */}
                <line x1={originX} y1={y} x2={svgSize - padRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={originX - 8} y={y + 3} fontSize="10" fill="#64748b" textAnchor="end">{label}</text>
              </g>
            );
          })}

          {/* Axes Base Lines */}
          <line x1={originX} y1={originY} x2={svgSize - padRight} y2={originY} stroke="#94a3b8" strokeWidth="1.5" />
          <line x1={originX} y1={originY} x2={originX} y2={padTop} stroke="#94a3b8" strokeWidth="1.5" />
          
          <text x={originX + chartW / 2} y={svgSize - 5} fontSize="11" fill="#475569" textAnchor="middle" fontWeight="500">
            Width (ft)
          </text>
          <text x={10} y={originY - chartH / 2} fontSize="11" fill="#475569" textAnchor="middle" fontWeight="500" transform={`rotate(-90 10 ${originY - chartH / 2})`}>
            Height (ft)
          </text>

          {/* Max Plant Shape (Ellipse starting from originX extending right and up) */}
          {actualHMax > 0 && actualWMax > 0 && (
            <ellipse
              cx={originX + (actualWMax * pxPerFt) / 2}
              cy={originY - (actualHMax * pxPerFt) / 2}
              rx={(actualWMax * pxPerFt) / 2}
              ry={(actualHMax * pxPerFt) / 2}
              fill="#bbf7d0" // green-200
              stroke="#22c55e" // green-500
              strokeWidth="2"
              opacity={0.6}
            />
          )}

          {/* Min Plant Shape (Darker core) */}
          {(actualHMin !== actualHMax || actualWMin !== actualWMax) && actualHMin > 0 && actualWMin > 0 && (
            <ellipse
              cx={originX + (actualWMin * pxPerFt) / 2}
              cy={originY - (actualHMin * pxPerFt) / 2}
              rx={(actualWMin * pxPerFt) / 2}
              ry={(actualHMin * pxPerFt) / 2}
              fill="#22c55e" // green-500
              opacity={0.8}
            />
          )}

          {/* Fence Reference */}
          {showFenceRef && (
            <g>
              <line 
                x1={originX} 
                y1={originY - 6 * pxPerFt} 
                x2={svgSize - padRight} 
                y2={originY - 6 * pxPerFt} 
                stroke="#94a3b8" 
                strokeDasharray="4 3" 
                strokeWidth="1.5"
              />
              <text x={svgSize - padRight} y={originY - 6 * pxPerFt - 5} fontSize="9" fill="#64748b" textAnchor="end" style={{ textShadow: "1px 1px 0px white, -1px -1px 0px white, 1px -1px 0px white, -1px 1px 0px white" }}>
                6 ft fence
              </text>
            </g>
          )}
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-600 border border-gray-100">
        <div>
          <span className="font-semibold text-gray-700">Height:</span> {metersToFeetLabel(heightMinM, heightMaxM) ?? "unknown"}
        </div>
        <div className="h-4 w-px bg-gray-300"></div>
        <div>
          <span className="font-semibold text-gray-700">Width:</span> {metersToFeetLabel(widthMinM, widthMaxM) ?? "unknown"}
        </div>
      </div>
    </div>
  );
}
