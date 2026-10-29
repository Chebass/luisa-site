import { Suspense } from "react";
import { CalendarPage } from "@/components/calendar-page";
import { ModuleSkeleton } from "@/components/module-skeleton";
export default function Page() {
  return (
    <Suspense fallback={<ModuleSkeleton module="calendario" />}>
      <CalendarPage />
    </Suspense>
  );
}
