import { useEffect } from "react";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { Sprout, Database, FileText } from "lucide-react";
import { useStore } from "./store/useStore";
import Dashboard from "./components/Dashboard";
import PlantDetail from "./components/PlantDetail";
import DatasetManager from "./components/DatasetManager";
import CareDocument from "./components/CareDocument";
import SelectionTray from "./components/SelectionTray";

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

export default function App() {
  const init = useStore((s) => s.init);
  const isLoaded = useStore((s) => s.isLoaded);

  useEffect(() => {
    init();
  }, [init]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Loading catalog…
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50 pb-20">
        <Nav />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plant/:id" element={<PlantDetail />} />
          <Route path="/manage" element={<DatasetManager />} />
          <Route path="/document" element={<CareDocument />} />
        </Routes>
        <SelectionTray />
      </div>
    </HashRouter>
  );
}
