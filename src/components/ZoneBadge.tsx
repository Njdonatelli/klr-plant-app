import type { Plant } from "../types";
import { sdSuitability, SD_SUITABILITY_LABEL, SD_SUITABILITY_COLOR } from "../lib/sanDiego";
import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

const ICON = {
  suited: CheckCircle2,
  marginal: AlertTriangle,
  unknown: HelpCircle,
};

export default function ZoneBadge({ plant, compact }: { plant: Plant; compact?: boolean }) {
  const status = sdSuitability(plant);
  const Icon = ICON[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${SD_SUITABILITY_COLOR[status]}`}
      title={SD_SUITABILITY_LABEL[status]}
    >
      <Icon className="h-3.5 w-3.5" />
      {!compact && SD_SUITABILITY_LABEL[status]}
    </span>
  );
}
