import Link from "next/link";
import { Leaf, ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
export function PublicShell({
  children,
  demo = false,
}: {
  children: React.ReactNode;
  demo?: boolean;
}) {
  return (
    <div className="public-page">
      <header className="public-header">
        <Brand href="/reservar" />
        <Link href="/login">
          Mi espacio <ArrowUpRight size={17} />
        </Link>
      </header>
      {demo && (
        <div className="demo-strip public-demo">
          Demostración local · No se hacen reservas reales
        </div>
      )}
      <main className="public-main" id="main-content">
        {children}
      </main>
      <footer className="public-footer">
        <Leaf size={17} />
        <span>Un momento para ti. Un poquito más de calma.</span>
        <span>Luisa · bienestar</span>
      </footer>
    </div>
  );
}
