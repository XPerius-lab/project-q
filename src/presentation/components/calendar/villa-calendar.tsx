import type { CalendarDayView } from "@/domain/repositories/villa-repository";

// Pure presentation component: takes already-resolved day data (gaps already
// filled with AVAILABLE by PrismaVillaRepository.getCalendar) and renders a
// month-grouped grid. No data fetching here — the page (server component)
// owns that, so this stays reusable/testable without D1.

const STATUS_STYLES: Record<CalendarDayView["status"], string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  BOOKED: "bg-red-50 text-red-400 line-through",
  BLOCKED_BY_ADMIN: "bg-gray-100 text-gray-400",
  BLOCKED_BY_OWNER: "bg-gray-100 text-gray-400",
};

const STATUS_LABELS: Record<CalendarDayView["status"], string> = {
  AVAILABLE: "Müsait",
  BOOKED: "Dolu",
  BLOCKED_BY_ADMIN: "Kapalı",
  BLOCKED_BY_OWNER: "Kapalı",
};

const TR_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const TR_WEEKDAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

function groupByMonth(days: CalendarDayView[]) {
  const groups = new Map<string, CalendarDayView[]>();
  for (const day of days) {
    const key = day.date.slice(0, 7); // YYYY-MM
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(day);
  }
  return [...groups.entries()];
}

// Monday-first leading blanks so the grid lines up under weekday headers.
function leadingBlankCount(firstDay: CalendarDayView): number {
  const jsDay = new Date(firstDay.date + "T00:00:00Z").getUTCDay(); // 0=Sun..6=Sat
  return (jsDay + 6) % 7; // shift to 0=Mon..6=Sun
}

export function VillaCalendar({ days, currency = "AZN" }: { days: CalendarDayView[]; currency?: string }) {
  const months = groupByMonth(days);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 text-sm">
        {(Object.keys(STATUS_LABELS) as CalendarDayView["status"][])
          .filter((s, i, arr) => arr.indexOf(s) === i)
          .map((status) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className={`inline-block h-3 w-3 rounded-sm ${STATUS_STYLES[status].split(" ")[0]}`} />
              {STATUS_LABELS[status]}
            </span>
          ))}
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        {months.map(([monthKey, monthDays]) => {
          const [year, month] = monthKey.split("-").map(Number);
          const blanks = leadingBlankCount(monthDays[0]);

          return (
            <div key={monthKey}>
              <h3 className="mb-2 font-medium">
                {TR_MONTHS[month - 1]} {year}
              </h3>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {TR_WEEKDAYS.map((w) => (
                  <div key={w} className="pb-1 font-medium text-muted-foreground">
                    {w}
                  </div>
                ))}
                {Array.from({ length: blanks }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {monthDays.map((day) => {
                  const dayNum = Number(day.date.slice(8, 10));
                  const isAvailable = day.status === "AVAILABLE";
                  return (
                    <div
                      key={day.date}
                      title={`${day.date} — ${STATUS_LABELS[day.status]}${
                        isAvailable ? ` — ${day.price} ${currency}` : ""
                      }`}
                      className={`flex aspect-square flex-col items-center justify-center rounded-md ${STATUS_STYLES[day.status]}`}
                    >
                      <span>{dayNum}</span>
                      {isAvailable && (
                        <span className="text-[10px] leading-tight">{Math.round(day.price)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
