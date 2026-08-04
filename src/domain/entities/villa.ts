// Domain layer: no Prisma/Next imports here. Pure business shape + rules.

export type VillaCategory =
  | "VILLA"
  | "DAILY_HOUSE"
  | "TINY_HOUSE"
  | "MOUNTAIN_HOUSE"
  | "CAMPSITE"
  | "CARAVAN"
  | "BOAT"
  | "EVENT_SPACE"
  | "STUDIO";

export interface Villa {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: VillaCategory;
  ownerId: string;
  city: string;
  region?: string;
  approxLat: number;
  approxLng: number;
  capacity: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  basePrice: number;
  checkInTime: string;
  checkOutTime: string;
  isActive: boolean;
  isFeatured: boolean;
}

export function calculateStayPrice(
  nightlyPrices: number[], // one entry per night, allows per-day overrides (fırsat/indirim)
): number {
  return nightlyPrices.reduce((sum, price) => sum + price, 0);
}
