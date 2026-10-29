import { Suspense } from "react";
import { ClientsPage } from "@/components/clients-page";
export default function Page() {
  return (
    <Suspense fallback={<p>Preparando tus clientes…</p>}>
      <ClientsPage />
    </Suspense>
  );
}
