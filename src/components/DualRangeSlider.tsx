import { useCallback, useRef, useState, useEffect } from "react";

interface Props {
  label: string;
  min: number;
  max: number;
  step?: number;
  valueLow: number;
  valueHigh: number;
  unit?: string;
  onChangeLow: (v: number) => void;
  onChangeHigh: (v: number) => void;
}

function snap(v: number, min: number, step: number): number {
  return Math.round((v - min) / step) * step + min;
}

export default function DualRangeSlider({
  label,
  min,
  max,
  step = 1,
  valueLow,
  valueHigh,
  unit = "ft",
  onChangeLow,
  onChangeHigh,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  // Which thumb is being dragged: "low" | "high" | null
  const dragging = useRef<"low" | "high" | null>(null);

  const range = max - min;
  const lowPct = ((valueLow - min) / range) * 100;
  const highPct = ((valueHigh - min) / range) * 100;

  const pctToValue = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current!.getBoundingClientRect();
      const raw = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, raw));
      return snap(clamped * range + min, min, step);
    },
    [min, max, step, range]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const v = pctToValue(e.clientX);
      // Pick which thumb is closer
      const distLow = Math.abs(v - valueLow);
      const distHigh = Math.abs(v - valueHigh);
      dragging.current = distLow <= distHigh ? "low" : "high";
      // Apply immediately
      if (dragging.current === "low") {
        onChangeLow(Math.min(v, valueHigh - step));
      } else {
        onChangeHigh(Math.max(v, valueLow + step));
      }
    },
    [pctToValue, valueLow, valueHigh, step, onChangeLow, onChangeHigh]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const v = pctToValue(e.clientX);
      if (dragging.current === "low") {
        onChangeLow(Math.min(v, valueHigh - step));
      } else {
        onChangeHigh(Math.max(v, valueLow + step));
      }
    },
    [pctToValue, valueLow, valueHigh, step, onChangeLow, onChangeHigh]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const isAny = valueLow === min && valueHigh === max;

  return (
    <div className="flex w-full flex-col justify-center rounded-lg border border-gray-300 px-3 py-1.5 bg-white shadow-sm select-none">
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-medium text-gray-700">
        <span>{label}</span>
        <span className="text-klr-600 tabular-nums">
          {isAny
            ? "Any"
            : valueLow === min
            ? `≤ ${valueHigh} ${unit}`
            : valueHigh === max
            ? `≥ ${valueLow} ${unit}`
            : `${valueLow}–${valueHigh} ${unit}`}
        </span>
      </div>

      {/* Track area — pointer events handled here */}
      <div
        ref={trackRef}
        className="relative mt-2 mb-0.5 h-5 cursor-pointer touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Background track */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-gray-200" />

        {/* Active fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-klr-500"
          style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }}
        />

        {/* Low thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-klr-600 bg-white shadow transition-shadow hover:shadow-md"
          style={{ left: `${lowPct}%` }}
        />

        {/* High thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-klr-600 bg-white shadow transition-shadow hover:shadow-md"
          style={{ left: `${highPct}%` }}
        />
      </div>

      {/* Min / max labels */}
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}
