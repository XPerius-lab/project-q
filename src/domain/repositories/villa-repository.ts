import type { Villa, VillaCategory } from "@/domain/entities/villa";

export interface VillaWithCover extends Villa {
  coverPhotoUrl: string | null;
  amenityLabels: string[];
}

export interface CalendarDayView {
  date: string; // ISO date-only (YYYY-MM-DD)
  status: "AVAILABLE" | "BOOKED" | "BLOCKED_BY_ADMIN" | "BLOCKED_BY_OWNER";
  price: number; // resolved price for that night (override ?? basePrice)
}

export interface VillaDetail extends VillaWithCover {
  photoUrls: string[];
}

export interface VillaRepository {
  list(params: {
    city?: string;
    category?: VillaCategory;
    minCapacity?: number;
    limit?: number;
  }): Promise<VillaWithCover[]>;

  findBySlug(slug: string): Promise<VillaDetail | null>;

  // Calendar for a villa across a date range — powers the availability grid.
  // Any date in range with no CalendarDay row is treated as AVAILABLE at basePrice
  // (rows only need to exist for exceptions: bookings, blocks, price overrides).
  getCalendar(villaId: string, from: Date, to: Date): Promise<CalendarDayView[]>;
}
