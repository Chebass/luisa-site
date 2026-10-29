import { Skeleton } from "./ui/skeleton";
export type ModuleName =
  | "inicio"
  | "calendario"
  | "clientes"
  | "disponibilidad"
  | "ajustes"
  | "notificaciones"
  | "mas";
export function ModuleSkeleton({ module = "inicio" }: { module?: ModuleName }) {
  return (
    <div
      className={`module-skeleton skeleton-${module}`}
      role="status"
      aria-label={`Cargando ${module}`}
    >
      <span className="sr-only">Preparando tu espacio…</span>
      <div className="skeleton-page-heading">
        <div>
          <Skeleton className="sk-eyebrow" />
          <Skeleton className="sk-title" />
          <Skeleton className="sk-description" />
        </div>
        <Skeleton className="sk-action" />
      </div>
      {module === "inicio" ? (
        <>
          <Skeleton className="sk-hero" />
          <div className="sk-stats">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="sk-stat" />
            ))}
          </div>
          <div className="sk-home-columns">
            <div>
              <Skeleton className="sk-section-title" />
              {[0, 1, 2].map((i) => (
                <AppointmentSkeleton key={i} />
              ))}
            </div>
            <div className="sk-aside">
              <Skeleton className="sk-calendar" />
              <Skeleton className="sk-panel" />
            </div>
          </div>
        </>
      ) : module === "calendario" ? (
        <>
          <div className="sk-toolbar">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
          <div className="sk-calendar-grid">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i}>
                <Skeleton className="sk-day-heading" />
                <Skeleton className="sk-event" />
                {i % 2 === 0 && <Skeleton className="sk-event" />}
              </div>
            ))}
          </div>
          <Skeleton className="sk-section-title" />
          <AppointmentSkeleton />
        </>
      ) : module === "clientes" ? (
        <>
          <Skeleton className="sk-search" />
          <div className="sk-client-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <div className="sk-client" key={i}>
                <Skeleton className="sk-avatar" />
                <Skeleton className="sk-name" />
                <Skeleton className="sk-description" />
                <Skeleton className="sk-client-footer" />
              </div>
            ))}
          </div>
        </>
      ) : module === "disponibilidad" ? (
        <>
          <Skeleton className="sk-intro" />
          <div className="sk-two-columns">
            {[0, 1].map((i) => (
              <div className="sk-form-panel" key={i}>
                <Skeleton className="sk-icon" />
                <Skeleton className="sk-section-title" />
                {[0, 1, 2].map((j) => (
                  <Skeleton className="sk-block" key={j} />
                ))}
                <Skeleton className="sk-action" />
              </div>
            ))}
          </div>
        </>
      ) : module === "ajustes" ? (
        <div className="sk-settings">
          <div className="sk-form-panel">
            <Skeleton className="sk-icon" />
            <Skeleton className="sk-section-title" />
            {Array.from({ length: 4 }, (_, i) => (
              <div className="sk-fields" key={i}>
                <Skeleton />
                <Skeleton />
              </div>
            ))}
            <Skeleton className="sk-action" />
          </div>
          <div className="sk-aside">
            <Skeleton className="sk-panel" />
            <Skeleton className="sk-panel" />
          </div>
        </div>
      ) : module === "notificaciones" ? (
        <div>
          {Array.from({ length: 4 }, (_, i) => (
            <div className="sk-notice" key={i}>
              <Skeleton className="sk-icon" />
              <div>
                <Skeleton className="sk-name" />
                <Skeleton className="sk-description" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="sk-two-columns">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton className="sk-panel" key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
function AppointmentSkeleton() {
  return (
    <div className="sk-appointment">
      <Skeleton className="sk-hour" />
      <div>
        <Skeleton className="sk-name" />
        <Skeleton className="sk-description" />
        <Skeleton className="sk-reminder" />
      </div>
    </div>
  );
}
