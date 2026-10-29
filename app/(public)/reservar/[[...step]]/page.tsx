import { notFound } from "next/navigation";
import { isDemo } from "@/lib/supabase/server";
import { BookingPage } from "@/components/booking-page";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ step?: string[] }>;
}) {
  const { step } = await params;
  if (step && (step.length !== 1 || !["datos", "listo"].includes(step[0])))
    notFound();
  return <BookingPage demo={isDemo()} />;
}
