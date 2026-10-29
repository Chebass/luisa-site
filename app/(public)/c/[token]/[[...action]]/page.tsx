import { notFound } from "next/navigation";
import { TokenPage } from "@/components/token-page";
import { isDemo } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tu cita",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string; action?: string[] }>;
}) {
  const { token, action } = await params;
  if (
    action &&
    (action.length !== 1 ||
      !["confirmar", "cancelar", "modificar"].includes(action[0]))
  )
    notFound();
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) && !isDemo()) notFound();
  return (
    <TokenPage
      key={`${token}:${action?.[0] ?? "summary"}`}
      token={token}
      action={action?.[0]}
      demo={isDemo()}
    />
  );
}
