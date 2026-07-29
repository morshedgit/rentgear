import type { APIRoute } from "astro";
import { mutateDb } from "@/lib/storage";
import { getEnv } from "@/lib/env";
import { HttpError } from "@/lib/http";
import type { RentalStatus } from "@/lib/types";

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const VALID: RentalStatus[] = ["reserved", "active", "completed", "cancelled"];

// Allowed transitions for a rental's lifecycle.
const TRANSITIONS: Record<RentalStatus, RentalStatus[]> = {
  reserved: ["active", "cancelled"],
  active: ["completed"],
  completed: [],
  cancelled: [],
};

// PATCH /api/rentals/[id] — advance a rental through its lifecycle and keep the
// gear's status in sync (out on rental when picked up, back in stock when
// returned or cancelled).
export const PATCH: APIRoute = async ({ request, params, locals }) => {
  const id = params.id;
  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const next = body.status as RentalStatus | undefined;
  if (!next || !VALID.includes(next)) {
    return json({ error: "Invalid target status." }, 400);
  }

  try {
    const rental = await mutateDb(getEnv(locals), (db) => {
      const rental = db.rentals.find((r) => r.id === id);
      if (!rental) throw new HttpError(404, "Rental not found.");
      if (rental.status === next) return rental;
      if (!TRANSITIONS[rental.status].includes(next)) {
        throw new HttpError(409, `Cannot move a ${rental.status} rental to ${next}.`);
      }

      rental.status = next;

      const gear = db.gear.find((g) => g.id === rental.gearId);
      if (gear) {
        if (next === "active") gear.status = "rented";
        if (next === "completed" || next === "cancelled") {
          // Only free the gear if no other active rental still holds it.
          const stillOut = db.rentals.some((r) => r.gearId === gear.id && r.status === "active");
          if (!stillOut && gear.status === "rented") gear.status = "available";
        }
      }
      return rental;
    });

    return json({ rental });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: "Could not update the rental." }, 500);
  }
};
