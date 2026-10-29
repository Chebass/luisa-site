import { LoginPage } from "@/components/login-page";
import { isConfigured, isDemo, requireOwner } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (isConfigured()) {
    let authorized = false;
    try {
      await requireOwner();
      authorized = true;
    } catch {
      /* Show the login form if there is no valid owner session. */
    }
    if (authorized) redirect("/inicio");
  }
  return (
    <LoginPage
      configured={isConfigured()}
      demo={isDemo()}
      error={Boolean((await searchParams).error)}
    />
  );
}
