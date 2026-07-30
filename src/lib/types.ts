// Domain types for RentGear — a peer-to-business outdoor gear rental marketplace.
//
// Business model:
//   - Lenders own gear they aren't using and consign it to the business.
//   - The business stores the gear at physical Hubs and rents it to Renters.
//   - Renters pick up / drop off gear at Hubs.
//   - Rental revenue is split: the business keeps a service fee, the lender
//     earns a payout for every completed rental of their gear.

export type Role = "renter" | "lender" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Hub {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  hours: string;
  phone: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  blurb: string;
}

// The lifecycle of a piece of gear inside the business.
export type GearStatus =
  | "pending" // submitted by a lender, awaiting business approval
  | "available" // in stock at a hub, rentable
  | "rented" // currently out with a renter
  | "maintenance" // being cleaned / repaired between rentals
  | "retired"; // returned to lender / removed from inventory

export interface Gear {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  ownerId: string; // the lender who consigned it
  hubId: string | null; // where it currently lives (null while pending)
  dailyPrice: number; // what the renter pays per day
  depositAmount: number; // refundable security deposit
  replacementValue: number; // used to size the deposit / insurance
  condition: "new" | "excellent" | "good" | "fair";
  brand: string;
  emoji: string; // fallback visual when no photo has been uploaded
  imageKey?: string; // R2 object key for an uploaded photo, served at /api/images/<key>
  status: GearStatus;
  createdAt: string;
}

export type RentalStatus =
  | "reserved" // booked, not yet picked up
  | "active" // picked up, out with renter
  | "completed" // returned and closed
  | "cancelled";

export interface Rental {
  id: string;
  gearId: string;
  renterId: string;
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string; // ISO date (YYYY-MM-DD)
  pickupHubId: string;
  dropoffHubId: string;
  days: number;
  dailyPrice: number;
  subtotal: number; // dailyPrice * days
  serviceFee: number; // business cut
  ownerPayout: number; // lender's share
  deposit: number;
  total: number; // what the renter pays upfront (subtotal + fee + deposit)
  status: RentalStatus;
  createdAt: string;
}

export interface Database {
  users: User[];
  hubs: Hub[];
  categories: Category[];
  gear: Gear[];
  rentals: Rental[];
}

// Share of rental subtotal the business retains; the rest is paid to the lender.
export const SERVICE_FEE_RATE = 0.25;
