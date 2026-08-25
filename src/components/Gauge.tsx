interface GaugeProps {
  label: string;
  min: number | null;
  max: number | null;
  scaleMax: number;
  unit: string;
  bandLabel?: string | null;
  colorClass?: string;
}

export default function Gauge({ label, min, max, scaleMax, unit, bandLabel, colorClass }: GaugeProps) {
  const hasData = min != null || max != null;
  const lo = min ?? 0;
  const hi = max ?? min ?? 0;
  const leftPct = Math.min(100, (lo / scaleMax) * 100);
  const widthPct = Math.max(2, Math.min(100 - leftPct, ((hi - lo) / scaleMax) * 100));

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {hasData ? `${lo}${hi !== lo ? `–${hi}` : ""} ${unit}` : "no data"}
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
        {hasData && (
          <div
            className={`absolute top-0 h-full rounded-full ${colorClass ?? "bg-klr-500"}`}
            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          />
        )}
      </div>
      {bandLabel && <div className="mt-1 text-xs font-medium text-klr-700">{bandLabel}</div>}
    </div>
  );
}
