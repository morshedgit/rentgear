import { round2 } from "./logic";
import type { Database } from "./types";

export interface DashboardMetrics {
  itemsAvailable: number;
  itemsRented: number;
  itemsPending: number;
  itemsMaintenance: number;
  activeRentals: number;
  reservedRentals: number;
  completedRentals: number;
  grossBooked: number; // subtotal across active + completed rentals
  serviceRevenue: number; // business cut across active + completed
  ownerPayouts: number; // owed/paid to lenders across active + completed
}

export function getDashboardMetrics(db: Database): DashboardMetrics {
  const earning = db.rentals.filter((r) => r.status === "active" || r.status === "completed");

  return {
    itemsAvailable: db.gear.filter((g) => g.status === "available").length,
    itemsRented: db.gear.filter((g) => g.status === "rented").length,
    itemsPending: db.gear.filter((g) => g.status === "pending").length,
    itemsMaintenance: db.gear.filter((g) => g.status === "maintenance").length,
    activeRentals: db.rentals.filter((r) => r.status === "active").length,
    reservedRentals: db.rentals.filter((r) => r.status === "reserved").length,
    completedRentals: db.rentals.filter((r) => r.status === "completed").length,
    grossBooked: round2(earning.reduce((s, r) => s + r.subtotal, 0)),
    serviceRevenue: round2(earning.reduce((s, r) => s + r.serviceFee, 0)),
    ownerPayouts: round2(earning.reduce((s, r) => s + r.ownerPayout, 0)),
  };
}
