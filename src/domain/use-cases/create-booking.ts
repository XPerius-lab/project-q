import type { VillaRepository } from "@/domain/repositories/villa-repository";
import type { BookingRepository } from "@/domain/repositories/booking-repository";
import { DateRangeUnavailableError } from "@/domain/repositories/booking-repository";
import type { Booking } from "@/domain/entities/booking";
import { calculateStayPrice } from "@/domain/entities/villa";
import type { UserRole } from "@/domain/entities/user";
import { hasPermission } from "@/domain/entities/user";

export class UnauthorizedActionError extends Error {}
export class InvalidDateRangeError extends Error {}

export async function createBooking(
  deps: { villaRepo: VillaRepository; bookingRepo: BookingRepository },
  actorRole: UserRole,
  input: { villaId: string; customerId: string; checkIn: Date; checkOut: Date; commissionRate: number },
): Promise<Booking> {
  if (!hasPermission(actorRole, "booking", "create")) {
    throw new UnauthorizedActionError("Bu işlem için yetkiniz yok.");
  }
  if (input.checkOut <= input.checkIn) {
    throw new InvalidDateRangeError("Çıkış tarihi, giriş tarihinden sonra olmalı.");
  }

  // Pre-check against the calendar view first — this is purely for a fast,
  // friendly error message. It is NOT the actual guard: createBookingWithDateLock
  // re-checks every night inside its own transaction against the DB, because
  // this pre-check and that write aren't atomic together (someone else could
  // book between the two calls). See infrastructure/repositories/booking-repository.ts.
  const calendar = await deps.villaRepo.getCalendar(input.villaId, input.checkIn, input.checkOut);
  const nights = calendar.filter((d) => d.date < isoDate(input.checkOut));
  const unavailable = nights.find((d) => d.status !== "AVAILABLE");
  if (unavailable) {
    throw new DateRangeUnavailableError(unavailable.date);
  }

  const totalPrice = calculateStayPrice(nights.map((d) => d.price));

  return deps.bookingRepo.createBookingWithDateLock({
    villaId: input.villaId,
    customerId: input.customerId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    totalPrice,
    commissionRate: input.commissionRate,
  });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
