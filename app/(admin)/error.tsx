"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state">
      <h1>No pudimos abrir tu agenda</h1>
      <p>Revisa tu conexión y vuelve a intentarlo.</p>
      <Button onClick={reset}>Volver a intentar</Button>
    </div>
  );
}
