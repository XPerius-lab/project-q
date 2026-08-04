export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED" | "FAILED";

export interface Booking {
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
  status: BookingStatus;
  paymentStatus: PaymentStatus;
}

// Business rule, isolated and unit-testable without touching DB/HTTP.
export function computeCommissionSplit(totalPrice: number, commissionRate: number) {
  const commissionAmount = Math.round(totalPrice * commissionRate * 100) / 100;
  const ownerPayoutAmount = Math.round((totalPrice - commissionAmount) * 100) / 100;
  return { commissionAmount, ownerPayoutAmount };
}

export function computeCancellationRefund(totalPrice: number, penaltyRate: number) {
  const penalty = Math.round(totalPrice * penaltyRate * 100) / 100;
  const refundAmount = Math.round((totalPrice - penalty) * 100) / 100;
  return { penalty, refundAmount };
}
