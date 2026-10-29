import { Flower2 } from "lucide-react";
import { ModuleSkeleton } from "./module-skeleton";
import { Skeleton } from "./ui/skeleton";

/** The authenticated app's shape, shown while its protected layout and data load. */
export function AppSkeleton() {
  return (
    <div className="app-shell app-loading-shell" aria-busy="true">
      <aside className="sidebar" aria-hidden="true">
        <div className="skeleton-brand">
          <Flower2 size={42} strokeWidth={1.3} />
          <span>
            luisa<small>BIENESTAR</small>
          </span>
        </div>
        <div className="skeleton-sidebar-nav">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="sk-sidebar-link" />
          ))}
        </div>
        <div className="skeleton-sidebar-profile">
          <Skeleton className="sk-profile-avatar" />
          <Skeleton className="sk-profile-name" />
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span className="topbar-name">Estamos preparando tu espacio…</span>
          <span className="mobile-brand">
            luisa<span>bienestar</span>
          </span>
          <div className="topbar-right" aria-hidden="true">
            <Skeleton className="sk-header-date" />
            <Skeleton className="sk-profile-avatar" />
          </div>
        </header>
        <main id="main-content" className="page-content">
          <ModuleSkeleton module="inicio" />
        </main>
      </div>
      <div className="app-skeleton-mobile-nav" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton className="sk-nav-icon" />
            <Skeleton className="sk-nav-label" />
          </div>
        ))}
      </div>
    </div>
  );
}
