import type { APIRoute } from "astro";
import { mutateDb } from "@/lib/storage";
import { getEnv } from "@/lib/env";
import { HttpError } from "@/lib/http";

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// PATCH /api/gear/[id] — ops actions on a piece of gear.
//   { action: "approve" }     pending -> available (lists it in the catalog)
//   { action: "reject" }      pending -> retired
//   { action: "maintenance" } available -> maintenance
//   { action: "restock" }     maintenance -> available
export const PATCH: APIRoute = async ({ request, params, locals }) => {
  const id = params.id;
  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const action = body.action;
  const allowed = ["approve", "reject", "maintenance", "restock"];
  if (!action || !allowed.includes(action)) {
    return json({ error: "Unknown action." }, 400);
  }

  try {
    const gear = await mutateDb(getEnv(locals), (db) => {
      const gear = db.gear.find((g) => g.id === id);
      if (!gear) throw new HttpError(404, "Gear not found.");

      switch (action) {
        case "approve":
          if (gear.status !== "pending") throw new HttpError(409, "Only pending gear can be approved.");
          gear.status = "available";
          break;
        case "reject":
          if (gear.status !== "pending") throw new HttpError(409, "Only pending gear can be declined.");
          gear.status = "retired";
          break;
        case "maintenance":
          if (gear.status !== "available") throw new HttpError(409, "Only available gear can go to maintenance.");
          gear.status = "maintenance";
          break;
        case "restock":
          if (gear.status !== "maintenance") throw new HttpError(409, "Only gear in maintenance can be restocked.");
          gear.status = "available";
          break;
      }
      return gear;
    });

    return json({ gear });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: "Could not update the gear." }, 500);
  }
};
