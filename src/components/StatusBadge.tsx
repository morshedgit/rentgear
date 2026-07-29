import type { GearStatus, RentalStatus } from "@/lib/types";

const gearStyles: Record<GearStatus, string> = {
  available: "bg-pine-100 text-pine-700",
  rented: "bg-sand-200 text-sand-800",
  pending: "bg-amber-100 text-amber-800",
  maintenance: "bg-blue-100 text-blue-800",
  retired: "bg-gray-200 text-gray-600",
};

const gearLabels: Record<GearStatus, string> = {
  available: "Available",
  rented: "Out on rental",
  pending: "Pending review",
  maintenance: "In maintenance",
  retired: "Retired",
};

const rentalStyles: Record<RentalStatus, string> = {
  reserved: "bg-sand-200 text-sand-800",
  active: "bg-pine-100 text-pine-700",
  completed: "bg-gray-200 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

export function GearStatusBadge({ status }: { status: GearStatus }) {
  return <span className={`badge ${gearStyles[status]}`}>{gearLabels[status]}</span>;
}

export function RentalStatusBadge({ status }: { status: RentalStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`badge ${rentalStyles[status]}`}>{label}</span>;
}
