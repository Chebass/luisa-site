import { redirect } from "next/navigation";
import { isDemo, requireOwner, isConfigured } from "@/lib/supabase/server";
import { createDemoStore } from "@/lib/demo";
import { loadStore } from "@/lib/server/data";
import { StoreProvider } from "@/components/store-provider";
import { AdminShell } from "@/components/admin-shell";
import { PageTransition } from "@/components/page-transition";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demo = isDemo();
  if (!demo) {
    if (!isConfigured()) redirect("/login");
    try {
      await requireOwner();
    } catch {
      redirect("/login");
    }
  }
  const initial = demo ? createDemoStore() : await loadStore();
  return (
    <StoreProvider initial={initial} demo={demo}>
      <AdminShell>
        <div>
          <PageTransition>{children}</PageTransition>
        </div>
      </AdminShell>
    </StoreProvider>
  );
}
