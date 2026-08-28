import { useEffect } from "react";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import {
  Sprout,
  Leaf,
  Database,
  FileText,
  AlertTriangle,
  RefreshCw,
  X,
  BarChart3,
} from "lucide-react";
import { useStore } from "./store/useStore";
import Dashboard from "./components/Dashboard";
import PlantDetail from "./components/PlantDetail";
import DatasetManager from "./components/DatasetManager";
import CareDocument from "./components/CareDocument";
import Explore from "./components/Explore";
import SelectionTray from "./components/SelectionTray";
import ErrorBoundary from "./components/ErrorBoundary";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Sprout;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Catalog", icon: Leaf },
  { to: "/explore", label: "Explore", icon: BarChart3 },
  { to: "/document", label: "Document", icon: FileText },
  { to: "/manage", label: "Manage", icon: Database },
];

function CountBadge({ count, active }: { count: number; active: boolean }) {
  if (count === 0) return null;
  return (
    <span
      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ${
        active ? "bg-white text-klr-700" : "bg-klr-600 text-white"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function DesktopNavLink({ item, docCount }: { item: NavItem; docCount: number }) {
  const location = useLocation();
  const active = location.pathname === item.to;
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${
        active
          ? "bg-klr-700 text-white shadow-sm"
          : "text-gray-600 hover:bg-klr-50 hover:text-klr-700"
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {item.label}
      {item.to === "/document" && <CountBadge count={docCount} active={active} />}
    </Link>
  );
}

function Nav() {
  const selectedCount = useStore((s) => s.selectedIds.size);
  return (
    <header className="no-print sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-klr-500 to-klr-800 shadow-sm">
            <Sprout className="h-5 w-5 text-white" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-tight text-klr-900">KLR</span>
            <span className="block text-[11px] font-medium text-gray-500">
              Plant Care Builder
            </span>
          </span>
        </Link>
        <nav className="ml-auto hidden gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <DesktopNavLink key={item.to} item={item} docCount={selectedCount} />
          ))}
        </nav>
        {/* Compact document shortcut on mobile (full nav lives in the bottom tab bar) */}
        <Link
          to="/document"
          className="ml-auto flex items-center gap-1.5 rounded-full bg-klr-50 px-3 py-1.5 text-xs font-semibold text-klr-800 md:hidden"
        >
          <FileText className="h-3.5 w-3.5" />
          {selectedCount > 0 ? selectedCount : "Doc"}
        </Link>
      </div>
    </header>
  );
}

function MobileTabBar() {
  const location = useLocation();
  const selectedCount = useStore((s) => s.selectedIds.size);
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active =
            location.pathname === item.to ||
            (item.to === "/" && location.pathname.startsWith("/plant/"));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
                active ? "text-klr-700" : "text-gray-400"
              }`}
            >
              <span
                className={`absolute top-0 h-0.5 w-8 rounded-b-full transition ${
                  active ? "bg-klr-600" : "bg-transparent"
                }`}
              />
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                {item.to === "/document" && selectedCount > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-klr-600 px-1 text-[9px] font-bold leading-none text-white">
                    {selectedCount > 99 ? "99+" : selectedCount}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
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
    <div className="no-print fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg md:bottom-4">
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
        <button onClick={retryInit} className="btn-primary">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-klr-500 to-klr-800">
          <Sprout className="h-7 w-7 text-white" />
        </span>
        <p className="text-sm text-gray-400">Loading catalog…</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <div className="min-h-screen pb-32 md:pb-20">
          <Nav />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plant/:id" element={<PlantDetail />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/manage" element={<DatasetManager />} />
            <Route path="/document" element={<CareDocument />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <SelectionTray />
          <MobileTabBar />
        </div>
        <PersistErrorBanner />
      </HashRouter>
    </ErrorBoundary>
  );
}
