import type { PrismaClient } from "@prisma/client";

// PlatformSetting is a plain key/value table (value is JSON-encoded) so admin
// can add new settings later without a migration. Only commissionRate is
// read anywhere yet — cancellationPenaltyRate etc. will follow the same
// pattern when the cancellation flow is built.
const DEFAULT_COMMISSION_RATE = 0.15;

export async function getCommissionRate(prisma: PrismaClient): Promise<number> {
  const row = await prisma.platformSetting.findUnique({ where: { key: "commissionRate" } });
  if (!row) return DEFAULT_COMMISSION_RATE;

  const parsed = JSON.parse(row.value);
  return typeof parsed === "number" ? parsed : DEFAULT_COMMISSION_RATE;
}
