import { Flower2 } from "lucide-react";
import Link from "next/link";
export function Brand({ href = "/inicio" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Luisa bienestar, inicio">
      <span className="brand-symbol">
        <Flower2 strokeWidth={1.3} />
      </span>
      <span>
        luisa<span className="brand-subtitle">TU ESPACIO DE BIENESTAR</span>
      </span>
    </Link>
  );
}
