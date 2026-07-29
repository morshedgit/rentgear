import { SERVICE_FEE_RATE } from "./types";
import type { Gear, Rental } from "./types";

// ---- Dates ---------------------------------------------------------------

// Inclusive rental day count. A one-day rental (same start/end) is 1 day.
export function rentalDays(startDate: string, endDate: string): number {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  const ms = end - start;
  if (ms < 0) return 0;
  return Math.floor(ms / 86_400_000) + 1;
}

// Do two inclusive date ranges overlap on any day?
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return Date.parse(aStart) <= Date.parse(bEnd) && Date.parse(bStart) <= Date.parse(aEnd);
}

// ---- Pricing -------------------------------------------------------------

export interface Quote {
  days: number;
  dailyPrice: number;
  subtotal: number;
  serviceFee: number;
  ownerPayout: number;
  deposit: number;
  total: number;
}

// Compute the full cost breakdown for renting a piece of gear over a range.
// The renter pays subtotal + service fee + a refundable deposit. The business
// keeps the service fee; the lender earns the rest of the subtotal.
export function quoteRental(gear: Pick<Gear, "dailyPrice" | "depositAmount">, startDate: string, endDate: string): Quote {
  const days = rentalDays(startDate, endDate);
  const subtotal = round2(days * gear.dailyPrice);
  const serviceFee = round2(subtotal * SERVICE_FEE_RATE);
  const ownerPayout = round2(subtotal - serviceFee);
  const deposit = gear.depositAmount;
  const total = round2(subtotal + serviceFee + deposit);
  return { days, dailyPrice: gear.dailyPrice, subtotal, serviceFee, ownerPayout, deposit, total };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---- Availability --------------------------------------------------------

// Gear can only be booked if it's in the rentable pool and no existing
// reserved/active rental overlaps the requested window.
export function isGearBookable(gear: Gear): boolean {
  return gear.status === "available" || gear.status === "rented";
}

export function hasConflict(rentals: Rental[], gearId: string, startDate: string, endDate: string): boolean {
  return rentals.some(
    (r) =>
      r.gearId === gearId &&
      (r.status === "reserved" || r.status === "active") &&
      rangesOverlap(r.startDate, r.endDate, startDate, endDate),
  );
}

// ---- Validation ----------------------------------------------------------

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

// ---- Formatting ----------------------------------------------------------

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function formatDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
