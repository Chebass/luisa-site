"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Home,
  Users,
  SlidersHorizontal,
  Clock3,
  Bell,
  ArrowUpRight,
  MoreHorizontal,
  Leaf,
  LogOut,
  WifiOff,
} from "lucide-react";
import { Brand } from "./brand";
import { useStore } from "./store-provider";
import { browserSupabase } from "@/lib/supabase/browser";
import { dayLabel } from "@/lib/dates";
import { clearOfflineAgenda } from "@/lib/offline";
import { useEffect, useState } from "react";
import { ModuleSkeleton, type ModuleName } from "./module-skeleton";
const modules = new Set([
  "inicio",
  "calendario",
  "clientes",
  "disponibilidad",
  "ajustes",
  "notificaciones",
  "mas",
]);
const navigation = [
  { href: "/inicio", label: "Mi día", icon: Home },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/disponibilidad", label: "Disponibilidad", icon: Clock3 },
  { href: "/ajustes", label: "Ajustes", icon: SlidersHorizontal },
];
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState<ModuleName | null>(null);
  useEffect(() => {
    setPending(null);
  }, [pathname]);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setPending(null), 15000);
    return () => clearTimeout(timer);
  }, [pending]);
  const { store, demo, online } = useStore();
  const unread = store.notifications.filter((n) => !n.read_at).length;
  return (
    <div
      className="app-shell"
      onClickCapture={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey)
          return;
        const a = (e.target as HTMLElement).closest("a[href]");
        if (!(a instanceof HTMLAnchorElement) || a.target === "_blank") return;
        const url = new URL(a.href);
        const section = url.pathname.slice(1);
        if (
          url.origin === location.origin &&
          url.pathname !== pathname &&
          modules.has(section)
        )
          setPending(section as ModuleName);
      }}
    >
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-caption">TU ESPACIO DE CUIDADO</div>
        <nav aria-label="Navegación principal">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname.startsWith(href) ? "active" : ""}`}
            >
              <Icon size={21} />
              {label}
              {href === "/inicio" && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Leaf size={23} strokeWidth={1.4} />
            <p>
              Cuidar de otros empieza
              <br />
              por cuidar de ti.
            </p>
          </div>
          <Link href="/reservar" className="public-link" target="_blank">
            Ver página de reservas <ArrowUpRight size={18} />
          </Link>
          <div className="owner-profile">
            <span className="avatar owner-avatar">
              {store.settings.owner_name[0]}
            </span>
            <span>
              <strong>{store.settings.owner_name}</strong>
              <small>Tu espacio personal</small>
            </span>
            {!demo && (
              <button
                className="icon-button"
                title="Cerrar sesión"
                onClick={async () => {
                  await browserSupabase().auth.signOut();
                  await clearOfflineAgenda();
                  sessionStorage.removeItem("luisa-last-agenda");
                  router.replace("/login");
                  router.refresh();
                }}
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span className="topbar-name">
            Un espacio para organizarte, sin prisa.
          </span>
          <span className="mobile-brand">
            luisa<span>bienestar</span>
          </span>
          <div className="topbar-right">
            <span className="topbar-date">
              {dayLabel(new Date(), "EEEE, d MMMM")}
            </span>
            {!online && <WifiOff size={20} />}
            <Link
              href="/notificaciones"
              className="notification-button"
              aria-label={`Notificaciones, ${unread} sin leer`}
            >
              <Bell size={23} strokeWidth={1.6} />
              {unread > 0 && <span className="notification-dot" />}
            </Link>
            <span className="avatar topbar-avatar">
              {store.settings.owner_name[0]}
            </span>
          </div>
        </header>
        {demo && (
          <div className="demo-strip">
            <span className="demo-dot" />
            Demostración · Datos ficticios guardados solo en este navegador
          </div>
        )}
        <main
          id="main-content"
          className="page-content"
          aria-busy={Boolean(pending)}
        >
          {pending && <ModuleSkeleton module={pending} />}
          <div hidden={Boolean(pending)}>{children}</div>
        </main>
        <footer className="desktop-footer">
          <span>Hecho para llevar tus días con calma.</span>
          <span>Luisa · bienestar</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Navegación móvil">
        {[
          { href: "/inicio", label: "Inicio", icon: Home },
          { href: "/calendario", label: "Calendario", icon: CalendarDays },
          { href: "/clientes", label: "Clientes", icon: Users },
          { href: "/mas", label: "Más", icon: MoreHorizontal },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={
              pathname === href ||
              (href === "/mas" &&
                ["/disponibilidad", "/ajustes"].includes(pathname))
                ? "active"
                : ""
            }
          >
            <Icon size={23} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
