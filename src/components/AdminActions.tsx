"use client";

import { useState } from "react";
import type { RentalStatus } from "@/lib/types";

// After a successful ops action we reload so the server-rendered dashboard
// re-fetches fresh data from the store.
function reload() {
  if (typeof window !== "undefined") window.location.reload();
}

async function patchGear(gearId: string, action: string) {
  const res = await fetch(`/api/gear/${gearId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  return res.ok;
}

async function patchRental(rentalId: string, status: RentalStatus) {
  const res = await fetch(`/api/rentals/${rentalId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.ok;
}

export function ApproveGearButtons({ gearId }: { gearId: string }) {
  const [busy, setBusy] = useState(false);

  async function run(action: "approve" | "reject") {
    setBusy(true);
    const ok = await patchGear(gearId, action);
    setBusy(false);
    if (ok) reload();
  }

  return (
    <div className="flex gap-2">
      <button className="btn-primary" disabled={busy} onClick={() => run("approve")}>
        Approve &amp; list
      </button>
      <button className="btn-secondary" disabled={busy} onClick={() => run("reject")}>
        Decline
      </button>
    </div>
  );
}

export function RentalActions({ rentalId, status }: { rentalId: string; status: RentalStatus }) {
  const [busy, setBusy] = useState(false);

  async function run(next: RentalStatus) {
    setBusy(true);
    const ok = await patchRental(rentalId, next);
    setBusy(false);
    if (ok) reload();
  }

  if (status === "reserved") {
    return (
      <div className="flex flex-wrap gap-1.5">
        <SmallBtn label="Mark picked up" onClick={() => run("active")} disabled={busy} />
        <SmallBtn label="Cancel" variant="ghost" onClick={() => run("cancelled")} disabled={busy} />
      </div>
    );
  }
  if (status === "active") {
    return <SmallBtn label="Mark returned" onClick={() => run("completed")} disabled={busy} />;
  }
  return <span className="text-xs text-pine-400">—</span>;
}

function SmallBtn({
  label,
  onClick,
  disabled,
  variant = "solid",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "solid" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
        variant === "solid"
          ? "bg-pine-600 text-white hover:bg-pine-700"
          : "border border-pine-200 text-pine-700 hover:bg-pine-50"
      }`}
    >
      {label}
    </button>
  );
}
