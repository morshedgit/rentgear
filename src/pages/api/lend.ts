import type { APIRoute } from "astro";
import { mutateDb } from "@/lib/storage";
import { getEnv } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { makeId } from "@/lib/ids";
import type { Gear, User } from "@/lib/types";

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const CONDITIONS = ["new", "excellent", "good", "fair"] as const;
type Condition = (typeof CONDITIONS)[number];

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// A sensible refundable deposit: ~35% of replacement value, floored at $20.
function suggestDeposit(replacementValue: number): number {
  return Math.max(20, Math.round((replacementValue * 0.35) / 5) * 5);
}

// POST /api/lend — a lender consigns a piece of gear. It's created in "pending"
// status for the ops team to review in the dashboard.
export const POST: APIRoute = async ({ request, locals }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const name = str(body.name);
  const description = str(body.description);
  const categoryId = str(body.categoryId);
  const hubId = str(body.hubId);
  const ownerName = str(body.ownerName);
  const ownerEmail = str(body.ownerEmail);
  const brand = str(body.brand) || "Unbranded";
  const condition = CONDITIONS.includes(body.condition as Condition) ? (body.condition as Condition) : "good";
  const dailyPrice = Number(body.dailyPrice);
  const replacementValue = Number(body.replacementValue);

  if (!name || !description || !categoryId || !hubId || !ownerName || !ownerEmail) {
    return json({ error: "Please fill in all required fields." }, 400);
  }
  if (!Number.isFinite(dailyPrice) || dailyPrice <= 0) {
    return json({ error: "Daily price must be a positive number." }, 400);
  }
  if (!Number.isFinite(replacementValue) || replacementValue <= 0) {
    return json({ error: "Replacement value must be a positive number." }, 400);
  }

  try {
    const gear = await mutateDb(getEnv(locals), (db): Gear => {
      const category = db.categories.find((c) => c.id === categoryId);
      if (!category) throw new HttpError(400, "Unknown category.");
      if (!db.hubs.some((h) => h.id === hubId)) throw new HttpError(400, "Unknown drop-off hub.");

      // Reuse an existing lender account by email, or create one.
      let owner = db.users.find((u) => u.email.toLowerCase() === ownerEmail.toLowerCase());
      if (!owner) {
        owner = {
          id: makeId("u"),
          name: ownerName,
          email: ownerEmail,
          role: "lender",
          createdAt: new Date().toISOString(),
        } satisfies User;
        db.users.push(owner);
      }

      const newGear: Gear = {
        id: makeId("g"),
        name,
        description,
        categoryId,
        ownerId: owner.id,
        hubId, // proposed drop-off hub; confirmed on approval
        dailyPrice: Math.round(dailyPrice),
        depositAmount: suggestDeposit(replacementValue),
        replacementValue: Math.round(replacementValue),
        condition,
        brand,
        emoji: category.emoji,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      db.gear.push(newGear);
      return newGear;
    });

    return json({ gear }, 201);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: "Could not submit the gear." }, 500);
  }
};
