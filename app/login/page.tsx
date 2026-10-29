import { LoginPage } from "@/components/login-page";
import { isConfigured, isDemo } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <LoginPage
      configured={isConfigured()}
      demo={isDemo()}
      error={Boolean((await searchParams).error)}
    />
  );
}
