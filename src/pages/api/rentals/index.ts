import type { APIRoute } from "astro";
import { mutateDb } from "@/lib/storage";
import { getEnv } from "@/lib/env";
import { hasConflict, isGearBookable, isIsoDate, quoteRental, rentalDays } from "@/lib/logic";
import { makeId } from "@/lib/ids";
import { HttpError } from "@/lib/http";
import type { Rental } from "@/lib/types";

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// POST /api/rentals — create a reservation for a piece of gear.
export const POST: APIRoute = async ({ request, locals }) => {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const { gearId, renterId, startDate, endDate, pickupHubId, dropoffHubId } = body;

  if (!gearId || !renterId || !pickupHubId || !dropoffHubId) {
    return json({ error: "Missing required booking fields." }, 400);
  }
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    return json({ error: "Pickup and return dates must be valid dates." }, 400);
  }
  if (rentalDays(startDate, endDate) < 1) {
    return json({ error: "Return date must be on or after the pickup date." }, 400);
  }

  try {
    const rental = await mutateDb(getEnv(locals), (db): Rental => {
      const gear = db.gear.find((g) => g.id === gearId);
      if (!gear) throw new HttpError(404, "That gear no longer exists.");
      if (!isGearBookable(gear)) throw new HttpError(409, "That gear isn't available to rent right now.");
      if (!db.users.some((u) => u.id === renterId)) throw new HttpError(400, "Unknown renter.");
      if (!db.hubs.some((h) => h.id === pickupHubId)) throw new HttpError(400, "Unknown pickup hub.");
      if (!db.hubs.some((h) => h.id === dropoffHubId)) throw new HttpError(400, "Unknown drop-off hub.");
      if (hasConflict(db.rentals, gearId, startDate, endDate)) {
        throw new HttpError(409, "Those dates overlap an existing booking.");
      }

      const quote = quoteRental(gear, startDate, endDate);
      const newRental: Rental = {
        id: makeId("r"),
        gearId,
        renterId,
        startDate,
        endDate,
        pickupHubId,
        dropoffHubId,
        days: quote.days,
        dailyPrice: quote.dailyPrice,
        subtotal: quote.subtotal,
        serviceFee: quote.serviceFee,
        ownerPayout: quote.ownerPayout,
        deposit: quote.deposit,
        total: quote.total,
        status: "reserved",
        createdAt: new Date().toISOString(),
      };
      db.rentals.push(newRental);
      return newRental;
    });

    return json({ rental }, 201);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: "Could not create the reservation." }, 500);
  }
};
