import { AvailabilityPage } from "@/components/availability-page";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ bloque?: string; regla?: string }>;
}) {
  const params = await searchParams;
  return (
    <AvailabilityPage
      key={`${params.bloque ?? ""}:${params.regla ?? ""}`}
      initialBlockId={params.bloque}
      initialRuleId={params.regla}
    />
  );
}
