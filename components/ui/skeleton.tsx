import { cn } from "@/lib/utils";
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}
export function SlotsSkeleton() {
  return (
    <div
      className="slots-skeleton"
      role="status"
      aria-label="Cargando horarios"
    >
      <span className="sr-only">Buscando horarios disponibles…</span>
      {Array.from({ length: 9 }, (_, i) => (
        <Skeleton key={i} className="skeleton-slot" />
      ))}
    </div>
  );
}
