"use server";

import { getRequestContext } from "@cloudflare/next-on-pages";
import { headers } from "next/headers";
import { createPrismaClient } from "@/infrastructure/db/client";
import { PrismaVillaRepository } from "@/infrastructure/repositories/villa-repository";
import { PrismaBookingRepository } from "@/infrastructure/repositories/booking-repository";
import { getCommissionRate } from "@/infrastructure/repositories/platform-settings";
import { requireRole } from "@/infrastructure/auth/session";
import { createBooking } from "@/domain/use-cases/create-booking";
import { DateRangeUnavailableError } from "@/domain/repositories/booking-repository";

export type CreateBookingActionResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string };

export async function createBookingAction(
  villaId: string,
  checkInIso: string,
  checkOutIso: string,
): Promise<CreateBookingActionResult> {
  try {
    // CUSTOMER veya ADMIN olmalı (bkz. PERMISSIONS.booking.create,
    // domain/entities/user.ts) — giriş yapmamış ziyaretçi burada 401 alır,
    // form zaten client tarafında "giriş yapmalısın" göstermeli.
    const { role, user } = await requireRole(await headers(), ["CUSTOMER", "ADMIN"]);

    const { env } = getRequestContext();
    const prisma = createPrismaClient(env.DB);
    const villaRepo = new PrismaVillaRepository(prisma);
    const bookingRepo = new PrismaBookingRepository(prisma);
    const commissionRate = await getCommissionRate(prisma);

    const booking = await createBooking({ villaRepo, bookingRepo }, role, {
      villaId,
      customerId: user.id,
      checkIn: new Date(checkInIso + "T00:00:00.000Z"),
      checkOut: new Date(checkOutIso + "T00:00:00.000Z"),
      commissionRate,
    });

    return { ok: true, bookingId: booking.id };
  } catch (err) {
    if (err instanceof DateRangeUnavailableError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof Response) {
      return { ok: false, error: "Rezervasyon için giriş yapmalısınız." };
    }
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Beklenmeyen bir hata oluştu." };
  }
}
