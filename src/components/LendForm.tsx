"use client";

import { useMemo, useState } from "react";
import type { Category } from "@/lib/types";

interface Props {
  categories: Category[];
  hubs: { id: string; name: string }[];
  serviceFeeRate: number;
}

export function LendForm({ categories, hubs, serviceFeeRate }: Props) {
  const [form, setForm] = useState({
    name: "",
    brand: "",
    categoryId: categories[0]?.id ?? "",
    description: "",
    dailyPrice: "",
    replacementValue: "",
    condition: "good",
    hubId: hubs[0]?.id ?? "",
    ownerName: "",
    ownerEmail: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Show the lender what they'd earn on a sample week-long rental.
  const estimate = useMemo(() => {
    const price = Number(form.dailyPrice);
    if (!price || price <= 0) return null;
    const weekly = price * 7;
    const payout = weekly * (1 - serviceFeeRate);
    return { weekly, payout };
  }, [form.dailyPrice, serviceFeeRate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/lend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dailyPrice: Number(form.dailyPrice),
          replacementValue: Number(form.replacementValue),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong.");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-6 rounded-xl bg-pine-50 p-6 text-center">
        <div className="text-4xl" aria-hidden>🎒</div>
        <h3 className="mt-3 text-lg font-bold text-pine-900">Submission received!</h3>
        <p className="mt-2 text-sm text-pine-700/80">
          Our ops team will review <strong>{form.name}</strong> and reach out about dropping it off. You can watch
          its status in the business dashboard.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <a className="btn-primary" href="/dashboard">Open dashboard →</a>
          <button
            className="btn-secondary"
            onClick={() => {
              setStatus("idle");
              setForm((f) => ({ ...f, name: "", brand: "", description: "", dailyPrice: "", replacementValue: "" }));
            }}
          >
            Lend another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Gear name" required>
          <input className="field-input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="2-Person Backpacking Tent" required />
        </Field>
        <Field label="Brand">
          <input className="field-input" value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="Ridgeline" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" required>
          <select className="field-input" value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Condition" required>
          <select className="field-input" value={form.condition} onChange={(e) => update("condition", e.target.value)}>
            <option value="new">New</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
          </select>
        </Field>
      </div>

      <Field label="Description" required>
        <textarea
          className="field-input min-h-[90px]"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What makes it great, what's included, sizing…"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Suggested daily price ($)" required>
          <input type="number" min="1" step="1" className="field-input" value={form.dailyPrice} onChange={(e) => update("dailyPrice", e.target.value)} placeholder="20" required />
        </Field>
        <Field label="Replacement value ($)" required>
          <input type="number" min="1" step="1" className="field-input" value={form.replacementValue} onChange={(e) => update("replacementValue", e.target.value)} placeholder="300" required />
        </Field>
      </div>

      <Field label="Drop-off hub" required>
        <select className="field-input" value={form.hubId} onChange={(e) => update("hubId", e.target.value)} required>
          {hubs.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 border-t border-pine-100 pt-4 sm:grid-cols-2">
        <Field label="Your name" required>
          <input className="field-input" value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} placeholder="Alex Rivera" required />
        </Field>
        <Field label="Your email" required>
          <input type="email" className="field-input" value={form.ownerEmail} onChange={(e) => update("ownerEmail", e.target.value)} placeholder="alex@example.com" required />
        </Field>
      </div>

      {estimate && (
        <div className="rounded-xl bg-sand-100 p-4 text-sm text-pine-800">
          At ${Number(form.dailyPrice).toFixed(0)}/day, a one-week rental earns you about{" "}
          <strong>${estimate.payout.toFixed(2)}</strong> (after our {Math.round(serviceFeeRate * 100)}% fee).
        </div>
      )}

      {status === "error" && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>}

      <button type="submit" className="btn-primary w-full" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">
        {label} {required && <span className="text-ember-500">*</span>}
      </span>
      {children}
    </label>
  );
}
