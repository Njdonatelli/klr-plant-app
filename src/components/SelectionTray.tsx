import { Link, useLocation } from "react-router-dom";
import { FileText, X } from "lucide-react";
import { useStore } from "../store/useStore";

export default function SelectionTray() {
  const selectedIds = useStore((s) => s.selectedIds);
  const clearSelection = useStore((s) => s.clearSelection);
  const location = useLocation();

  if (selectedIds.size === 0 || location.pathname === "/document") return null;

  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-40 px-3 md:bottom-0 md:px-0">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-klr-200 bg-white/95 px-4 py-2.5 shadow-card-hover backdrop-blur md:max-w-7xl md:rounded-none md:rounded-t-none md:border-x-0 md:border-b-0 md:border-t md:border-gray-200 md:px-4 md:py-3 md:shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <span className="text-xs font-medium text-gray-700 sm:text-sm">
          <span className="font-bold text-klr-800">{selectedIds.size}</span> plant
          {selectedIds.size === 1 ? "" : "s"} selected
        </span>
        <button
          onClick={clearSelection}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 sm:text-sm"
        >
          <X className="h-3.5 w-3.5" /> clear
        </button>
        <Link
          to="/document"
          className="ml-auto flex items-center gap-2 rounded-xl bg-klr-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-klr-700 sm:px-4 sm:py-2 sm:text-sm"
        >
          <FileText className="h-4 w-4" /> Build care document
        </Link>
      </div>
    </div>
  );
}
