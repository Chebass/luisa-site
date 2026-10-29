import Link from "next/link";
export default function NotFound() {
  return (
    <main className="public-shell" id="main-content">
      <div className="empty-state">
        <h1>Este camino no lleva a una página</h1>
        <p>Puedes volver a tu espacio o reservar un momento de bienestar.</p>
        <Link href="/" className="button button-primary">
          Volver al inicio
        </Link>
        <Link href="/reservar" className="button button-outline">
          Reservar una cita
        </Link>
      </div>
    </main>
  );
}
