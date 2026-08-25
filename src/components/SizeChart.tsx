import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { metersToFeetLabel } from "../lib/units";

const M_TO_FT = 3.28084;

interface Props {
  heightMinM: number | null;
  heightMaxM: number | null;
  widthMinM: number | null;
  widthMaxM: number | null;
}

export default function SizeChart({ heightMinM, heightMaxM, widthMinM, widthMaxM }: Props) {
  const hMax = heightMaxM != null ? heightMaxM * M_TO_FT : heightMinM != null ? heightMinM * M_TO_FT : null;
  const wMax = widthMaxM != null ? widthMaxM * M_TO_FT : widthMinM != null ? widthMinM * M_TO_FT : null;

  if (hMax == null && wMax == null) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-400">
        No mature size data on file for this plant
      </div>
    );
  }

  const data = [
    { name: "Height at maturity", ft: hMax ?? 0, fill: "#2f6b3a" },
    { name: "Width at maturity", ft: wMax ?? 0, fill: "#6fa177" },
  ].filter((d) => d.ft > 0);

  const dataMax = Math.max(hMax ?? 0, wMax ?? 0);
  // Only compare against a 6ft fence when the plant is actually in that size
  // range -- forcing every 8-inch annual onto a 0-6.5ft axis made its bars
  // invisible. Small plants get an axis scaled to their own data instead.
  const showFenceRef = dataMax > 2.5;
  const rawDomain = (showFenceRef ? Math.max(dataMax, 6.5) : dataMax) * 1.2;
  // Recharts includes the raw domain max as a tick verbatim -- round it to a
  // clean step so the axis doesn't print float noise like "1.7992126...ft".
  const step = rawDomain <= 3 ? 0.25 : rawDomain <= 10 ? 1 : 5;
  const maxDomain = Math.ceil(rawDomain / step) * step;

  return (
    <div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 18, bottom: 8 }}>
          <XAxis
            type="number"
            domain={[0, maxDomain]}
            unit=" ft"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""))}
          />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: number) => [`${v.toFixed(1)} ft`, ""]} />
          {showFenceRef && (
            <ReferenceLine x={6} stroke="#94a3b8" strokeDasharray="4 3" label={{ value: "6 ft fence", position: "top", fontSize: 10, fill: "#64748b" }} />
          )}
          <Bar dataKey="ft" radius={[0, 6, 6, 0]} barSize={22}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Height: {metersToFeetLabel(heightMinM, heightMaxM) ?? "unknown"}</span>
        <span>Width: {metersToFeetLabel(widthMinM, widthMaxM) ?? "unknown"}</span>
      </div>
    </div>
  );
}
