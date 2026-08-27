import { useEffect } from "react";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { Sprout, Database, FileText, AlertTriangle, RefreshCw, X } from "lucide-react";
import { useStore } from "./store/useStore";
import Dashboard from "./components/Dashboard";
import PlantDetail from "./components/PlantDetail";
import DatasetManager from "./components/DatasetManager";
import CareDocument from "./components/CareDocument";
import SelectionTray from "./components/SelectionTray";
import ErrorBoundary from "./components/ErrorBoundary";

function NavLink({ to, children, icon: Icon }: { to: string; children: React.ReactNode; icon: typeof Sprout }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
        active ? "bg-klr-600 text-white" : "text-gray-600 hover:bg-klr-50 hover:text-klr-700"
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="hidden sm:inline">{children}</span>
      <span className="sm:hidden">{children}</span>
    </Link>
  );
}

function Nav() {
  const selectedCount = useStore((s) => s.selectedIds.size);
  return (
    <header className="no-print sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 flex-wrap">
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 font-bold text-klr-800 text-sm sm:text-base">
          <Sprout className="h-5 w-5 sm:h-6 sm:w-6 text-klr-600 flex-shrink-0" />
          <span className="hidden xs:inline">KLR Plant Care Builder</span>
          <span className="xs:hidden">KLR</span>
        </Link>
        <nav className="ml-auto flex gap-1 flex-wrap">
          <NavLink to="/" icon={Sprout}>
            Catalog
          </NavLink>
          <NavLink to="/manage" icon={Database}>
            Manage
          </NavLink>
          <NavLink to="/document" icon={FileText}>
            Doc{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <p className="text-gray-500">Page not found.</p>
      <Link to="/" className="mt-4 inline-block text-klr-700 underline">
        Back to catalog
      </Link>
    </div>
  );
}

function PersistErrorBanner() {
  const persistError = useStore((s) => s.persistError);
  const dismiss = useStore((s) => s.dismissPersistError);
  if (!persistError) return null;
  return (
    <div className="no-print fixed bottom-4 left-1/2 z-50 flex w-full max-w-lg -translate-x-1/2 items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <p className="flex-1 text-sm text-amber-800">{persistError}</p>
      <button onClick={dismiss} className="text-amber-500 hover:text-amber-800">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function App() {
  const init = useStore((s) => s.init);
  const retryInit = useStore((s) => s.retryInit);
  const isLoaded = useStore((s) => s.isLoaded);
  const initError = useStore((s) => s.initError);

  useEffect(() => {
    init();
  }, [init]);

  if (initError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <h1 className="text-lg font-semibold text-gray-900">Could not load plant catalog</h1>
        <p className="max-w-sm text-sm text-gray-500">
          Storage may be unavailable (e.g. private browsing mode). Try reloading or switching to a
          regular browser window.
        </p>
        <button
          onClick={retryInit}
          className="flex items-center gap-2 rounded-lg bg-klr-600 px-4 py-2 text-sm font-medium text-white hover:bg-klr-700"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Loading catalog…
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <div className="min-h-screen bg-gray-50 pb-20">
          <Nav />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plant/:id" element={<PlantDetail />} />
            <Route path="/manage" element={<DatasetManager />} />
            <Route path="/document" element={<CareDocument />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <SelectionTray />
        </div>
        <PersistErrorBanner />
      </HashRouter>
    </ErrorBoundary>
  );
}
