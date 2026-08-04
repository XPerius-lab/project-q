import { Prisma, type PrismaClient } from "@prisma/client";
import type { BookingRepository } from "@/domain/repositories/booking-repository";
import { DateRangeUnavailableError } from "@/domain/repositories/booking-repository";
import type { Booking, BookingStatus, PaymentStatus } from "@/domain/entities/booking";
import { computeCommissionSplit } from "@/domain/entities/booking";

// The double-booking guard lives here, not in the use-case layer, because it's
// only meaningful as an atomic DB operation — see README "Teknoloji Kararları":
// CalendarDay.@@unique([villaId, date]) is the actual source of truth, this
// class just orchestrates around it correctly.
export class PrismaBookingRepository implements BookingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createBookingWithDateLock(input: {
    villaId: string;
    customerId: string;
    checkIn: Date;
    checkOut: Date;
    totalPrice: number;
    commissionRate: number;
  }): Promise<Booking> {
    const nights = nightsInRange(input.checkIn, input.checkOut);
    if (nights.length === 0) {
      throw new Error("checkOut, checkIn'den sonra olmalı.");
    }

    const { commissionAmount, ownerPayoutAmount } = computeCommissionSplit(
      input.totalPrice,
      input.commissionRate,
    );

    // Everything below runs in one D1/SQLite transaction. D1 serializes writes
    // per-database, so the check-then-write sequence here can't race against
    // another createBookingWithDateLock call the way it could on a
    // multi-writer DB — but we still don't TRUST that: every night is claimed
    // through the unique constraint or a conditional update, never a bare
    // write, so a bug in this reasoning fails loudly (unique violation /
    // updateMany count 0) instead of silently double-booking.
    return this.prisma.$transaction(async (tx) => {
      const bookingRow = await tx.booking.create({
        data: {
          villaId: input.villaId,
          customerId: input.customerId,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          nightsCount: nights.length,
          totalPrice: input.totalPrice,
          commissionRate: input.commissionRate,
          commissionAmount,
          ownerPayoutAmount,
          status: "PENDING",
          paymentStatus: "PENDING",
        },
      });

      for (const date of nights) {
        await claimNight(tx, input.villaId, date, bookingRow.id);
      }

      return toDomainBooking(bookingRow);
    });
  }

  async findById(id: string): Promise<Booking | null> {
    const row = await this.prisma.booking.findUnique({ where: { id } });
    return row ? toDomainBooking(row) : null;
  }

  async cancel(id: string, reason: string): Promise<Booking> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
      });

      // Free up every night this booking was holding. Anything BLOCKED_BY_*
      // is left alone on purpose — cancelling a booking should never make an
      // admin/owner block available again.
      await tx.calendarDay.updateMany({
        where: { bookingId: id, status: "BOOKED" },
        data: { status: "AVAILABLE", bookingId: null },
      });

      return toDomainBooking(row);
    });
  }
}

// One entry per night, checkOut date itself excluded (hotel-style: the guest
// leaves that morning, so it's not a night they occupied).
function nightsInRange(checkIn: Date, checkOut: Date): Date[] {
  const nights: Date[] = [];
  for (let d = new Date(checkIn); d < checkOut; d.setUTCDate(d.getUTCDate() + 1)) {
    nights.push(new Date(d));
  }
  return nights;
}

type TxClient = Prisma.TransactionClient;

// Claims a single night for this booking. Two paths:
// - No CalendarDay row yet (the common case — rows only exist for exceptions)
//   -> plain create, guarded by the @@unique([villaId, date]) constraint.
// - A row already exists (price override, or someone else's block/booking)
//   -> the create above throws P2002, so we fall back to a conditional
//      update that only succeeds if that row is still AVAILABLE.
// Either branch failing means the night isn't ours -> DateRangeUnavailableError,
// which rolls back the whole transaction (including the booking row already
// created above).
async function claimNight(tx: TxClient, villaId: string, date: Date, bookingId: string) {
  try {
    await tx.calendarDay.create({
      data: { villaId, date, status: "BOOKED", bookingId },
    });
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;

    const claimed = await tx.calendarDay.updateMany({
      where: { villaId, date, status: "AVAILABLE" },
      data: { status: "BOOKED", bookingId },
    });

    if (claimed.count === 0) {
      throw new DateRangeUnavailableError(date.toISOString().slice(0, 10));
    }
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

type BookingRow = {
  id: string;
  villaId: string;
  customerId: string;
  checkIn: Date;
  checkOut: Date;
  nightsCount: number;
  totalPrice: number;
  commissionRate: number;
  commissionAmount: number;
  ownerPayoutAmount: number;
  status: string;
  paymentStatus: string;
};

function toDomainBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    villaId: row.villaId,
    customerId: row.customerId,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    nightsCount: row.nightsCount,
    totalPrice: row.totalPrice,
    commissionRate: row.commissionRate,
    commissionAmount: row.commissionAmount,
    ownerPayoutAmount: row.ownerPayoutAmount,
    status: row.status as BookingStatus,
    paymentStatus: row.paymentStatus as PaymentStatus,
  };
}
