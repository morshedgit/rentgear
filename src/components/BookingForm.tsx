"use client";

import { useMemo, useState } from "react";

interface HubOption {
  id: string;
  name: string;
  city: string;
}

interface Props {
  gearId: string;
  dailyPrice: number;
  depositAmount: number;
  serviceFeeRate: number;
  hubs: HubOption[];
  defaultHubId: string;
  renters: { id: string; name: string }[];
  busy: { startDate: string; endDate: string }[];
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function daysBetween(start: string, end: string): number {
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0;
  return Math.floor((e - s) / 86_400_000) + 1;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return Date.parse(aStart) <= Date.parse(bEnd) && Date.parse(bStart) <= Date.parse(aEnd);
}

export function BookingForm({
  gearId,
  dailyPrice,
  depositAmount,
  serviceFeeRate,
  hubs,
  defaultHubId,
  renters,
  busy,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pickupHubId, setPickupHubId] = useState(defaultHubId);
  const [dropoffHubId, setDropoffHubId] = useState(defaultHubId);
  const [renterId, setRenterId] = useState(renters[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const quote = useMemo(() => {
    const days = daysBetween(startDate, endDate);
    const subtotal = round2(days * dailyPrice);
    const serviceFee = round2(subtotal * serviceFeeRate);
    const total = round2(subtotal + serviceFee + depositAmount);
    return { days, subtotal, serviceFee, total };
  }, [startDate, endDate, dailyPrice, serviceFeeRate, depositAmount]);

  const conflict = useMemo(() => {
    if (!startDate || !endDate || quote.days === 0) return false;
    return busy.some((b) => overlaps(startDate, endDate, b.startDate, b.endDate));
  }, [startDate, endDate, quote.days, busy]);

  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const canSubmit = quote.days > 0 && !conflict && !!pickupHubId && !!dropoffHubId && !!renterId && status !== "submitting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gearId, renterId, startDate, endDate, pickupHubId, dropoffHubId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      setMessage(`Reserved! Pick up at your hub on ${startDate}.`);
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="card p-6">
        <div className="text-3xl" aria-hidden>✅</div>
        <h2 className="mt-3 text-xl font-bold text-pine-900">Reservation confirmed</h2>
        <p className="mt-2 text-sm text-pine-700/80">{message}</p>
        <div className="mt-4 rounded-xl bg-pine-50 p-4 text-sm">
          <Row label="Rental days" value={`${quote.days}`} />
          <Row label="Rental cost" value={fmt(quote.subtotal)} />
          <Row label="Service fee" value={fmt(quote.serviceFee)} />
          <Row label="Refundable deposit" value={fmt(depositAmount)} />
          <div className="mt-2 border-t border-pine-200 pt-2">
            <Row label="Charged today" value={fmt(quote.total)} strong />
          </div>
        </div>
        <a className="btn-secondary mt-4 w-full" href="/dashboard">
          View in dashboard →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-pine-900">Reserve this gear</h2>
        <div>
          <span className="text-2xl font-bold text-pine-900">{fmt(dailyPrice)}</span>
          <span className="text-sm text-pine-600">/day</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="start" className="field-label">Pickup date</label>
          <input
            id="start"
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="field-input"
            required
          />
        </div>
        <div>
          <label htmlFor="end" className="field-label">Return date</label>
          <input
            id="end"
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="field-input"
            required
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pickup" className="field-label">Pick up at</label>
          <select id="pickup" value={pickupHubId} onChange={(e) => setPickupHubId(e.target.value)} className="field-input">
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dropoff" className="field-label">Drop off at</label>
          <select id="dropoff" value={dropoffHubId} onChange={(e) => setDropoffHubId(e.target.value)} className="field-input">
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="renter" className="field-label">Renting as</label>
        <select id="renter" value={renterId} onChange={(e) => setRenterId(e.target.value)} className="field-input">
          {renters.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-pine-500">Demo accounts stand in for a logged-in renter.</p>
      </div>

      {/* Quote */}
      {quote.days > 0 && (
        <div className="mt-4 rounded-xl bg-sand-100 p-4 text-sm">
          <Row label={`${fmt(dailyPrice)} × ${quote.days} day${quote.days === 1 ? "" : "s"}`} value={fmt(quote.subtotal)} />
          <Row label="Service fee" value={fmt(quote.serviceFee)} />
          <Row label="Refundable deposit" value={fmt(depositAmount)} />
          <div className="mt-2 border-t border-sand-300 pt-2">
            <Row label="Due at pickup" value={fmt(quote.total)} strong />
          </div>
        </div>
      )}

      {conflict && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Those dates overlap an existing booking. Please choose another window.
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
      )}

      <button type="submit" className="btn-primary mt-4 w-full" disabled={!canSubmit}>
        {status === "submitting" ? "Reserving…" : "Reserve gear"}
      </button>
      <p className="mt-2 text-center text-xs text-pine-500">
        You won&apos;t be charged in this demo — this books a reservation you can see in the dashboard.
      </p>
    </form>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={strong ? "font-semibold text-pine-900" : "text-pine-700"}>{label}</span>
      <span className={strong ? "font-bold text-pine-900" : "text-pine-800"}>{value}</span>
    </div>
  );
}
