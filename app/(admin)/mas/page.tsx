import Link from "next/link";
import {
  Clock3,
  SlidersHorizontal,
  Bell,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
export default function Page() {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TODO EN SU LUGAR</div>
          <h1>Tu espacio</h1>
          <p>Organiza tus horarios y haz que la app sea tuya.</p>
        </div>
      </div>
      <div className="more-menu">
        {[
          {
            href: "/disponibilidad",
            title: "Disponibilidad",
            description: "Tus horarios fijos y momentos de pausa",
            icon: Clock3,
          },
          {
            href: "/ajustes",
            title: "Ajustes",
            description: "Tu perfil, mensajes e instalación",
            icon: SlidersHorizontal,
          },
          {
            href: "/notificaciones",
            title: "Notificaciones",
            description: "Las novedades de tu agenda",
            icon: Bell,
          },
          {
            href: "/reservar",
            title: "Página de reservas",
            description: "Así te ven tus clientes",
            icon: ExternalLink,
          },
        ].map(({ href, title, description, icon: Icon }) => (
          <Link href={href} key={href}>
            <span className="section-icon">
              <Icon size={25} />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <ArrowUpRight size={22} />
          </Link>
        ))}
      </div>
    </>
  );
}
