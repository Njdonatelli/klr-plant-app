import { Link, useLocation } from "react-router-dom";
import { FileText, X } from "lucide-react";
import { useStore } from "../store/useStore";

export default function SelectionTray() {
  const selectedIds = useStore((s) => s.selectedIds);
  const clearSelection = useStore((s) => s.clearSelection);
  const location = useLocation();

  if (selectedIds.size === 0 || location.pathname === "/document") return null;

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <span className="text-sm font-medium text-gray-700">
          {selectedIds.size} plant{selectedIds.size === 1 ? "" : "s"} selected for care document
        </span>
        <button onClick={clearSelection} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700">
          <X className="h-3.5 w-3.5" /> clear
        </button>
        <Link
          to="/document"
          className="ml-auto flex items-center gap-2 rounded-lg bg-klr-600 px-4 py-2 text-sm font-medium text-white hover:bg-klr-700"
        >
          <FileText className="h-4 w-4" /> Build care document
        </Link>
      </div>
    </div>
  );
}
