const M_TO_FT = 3.28084;

export function metersToFeetLabel(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const fmt = (m: number) => {
    const ft = m * M_TO_FT;
    return ft < 10 ? ft.toFixed(1) : Math.round(ft).toString();
  };
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)} ft`;
  if (min != null) return `${fmt(min)}+ ft`;
  return `up to ${fmt(max as number)} ft`;
}

export function metersToFeetShort(m: number | null): string | null {
  if (m == null) return null;
  const ft = m * M_TO_FT;
  return ft < 10 ? `${ft.toFixed(1)} ft` : `${Math.round(ft)} ft`;
}
