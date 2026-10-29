import { Suspense } from "react";
import { CalendarPage } from "@/components/calendar-page";
export default function Page() {
  return (
    <Suspense fallback={<p>Preparando tu calendario…</p>}>
      <CalendarPage />
    </Suspense>
  );
}
