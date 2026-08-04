import type { Booking } from "@/domain/entities/booking";

// Domain defines the contract; infrastructure/repositories implements it against Prisma+D1.
// This is what keeps double-booking protection swappable/testable independent of the DB.
export interface BookingRepository {
  createBookingWithDateLock(input: {
    villaId: string;
    customerId: string;
    checkIn: Date;
    checkOut: Date;
    totalPrice: number;
    commissionRate: number;
  }): Promise<Booking>;

  findById(id: string): Promise<Booking | null>;

  cancel(id: string, reason: string): Promise<Booking>;
}

// Thrown by createBookingWithDateLock when any night in the requested range is
// no longer AVAILABLE by the time the DB-level check runs (booked in the
// meantime, or blocked by admin/owner). Callers (use-cases/route handlers)
// catch this specifically to show "bu tarihler artık müsait değil" instead of
// a generic 500 — see PrismaBookingRepository for where it's thrown.
export class DateRangeUnavailableError extends Error {
  constructor(public readonly conflictingDate: string) {
    super(`Tarih artık müsait değil: ${conflictingDate}`);
    this.name = "DateRangeUnavailableError";
  }
}
