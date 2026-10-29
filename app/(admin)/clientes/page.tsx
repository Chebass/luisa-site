import { Suspense } from "react";
import { ClientsPage } from "@/components/clients-page";
import { ModuleSkeleton } from "@/components/module-skeleton";
export default function Page() {
  return (
    <Suspense fallback={<ModuleSkeleton module="clientes" />}>
      <ClientsPage />
    </Suspense>
  );
}
