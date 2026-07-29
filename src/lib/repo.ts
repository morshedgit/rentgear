import type { Category, Database, Gear, Hub, Rental, User } from "./types";

// Read-side queries with the joins the UI needs. These are pure functions over
// a Database snapshot — the caller loads the snapshot once (via loadDb) and
// passes it in, keeping storage access out of the query layer.

export interface GearView extends Gear {
  category: Category | null;
  hub: Hub | null;
  owner: User | null;
}

export interface RentalView extends Rental {
  gear: Gear | null;
  renter: User | null;
  pickupHub: Hub | null;
  dropoffHub: Hub | null;
}

export function getHubs(db: Database): Hub[] {
  return db.hubs;
}

export function getHub(db: Database, id: string): Hub | null {
  return db.hubs.find((h) => h.id === id) ?? null;
}

export function getCategories(db: Database): Category[] {
  return db.categories;
}

export function getUsers(db: Database): User[] {
  return db.users;
}

function toGearView(db: Database, gear: Gear): GearView {
  return {
    ...gear,
    category: db.categories.find((c) => c.id === gear.categoryId) ?? null,
    hub: gear.hubId ? (db.hubs.find((h) => h.id === gear.hubId) ?? null) : null,
    owner: db.users.find((u) => u.id === gear.ownerId) ?? null,
  };
}

export interface GearFilter {
  categorySlug?: string;
  hubId?: string;
  search?: string;
  // when true, include gear that is not part of the public catalog
  includeNonPublic?: boolean;
}

export function getGearList(db: Database, filter: GearFilter = {}): GearView[] {
  let items = db.gear;

  if (!filter.includeNonPublic) {
    // Public catalog only surfaces gear the business actively rents.
    items = items.filter((g) => g.status === "available" || g.status === "rented");
  }
  if (filter.categorySlug) {
    const cat = db.categories.find((c) => c.slug === filter.categorySlug);
    items = cat ? items.filter((g) => g.categoryId === cat.id) : [];
  }
  if (filter.hubId) {
    items = items.filter((g) => g.hubId === filter.hubId);
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    items = items.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.brand.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q),
    );
  }
  return items.map((g) => toGearView(db, g));
}

export function getGear(db: Database, id: string): GearView | null {
  const gear = db.gear.find((g) => g.id === id);
  return gear ? toGearView(db, gear) : null;
}

export function getRentalsForGear(db: Database, gearId: string): Rental[] {
  return db.rentals.filter((r) => r.gearId === gearId);
}

export function getRentals(db: Database): RentalView[] {
  return db.rentals
    .map((r) => ({
      ...r,
      gear: db.gear.find((g) => g.id === r.gearId) ?? null,
      renter: db.users.find((u) => u.id === r.renterId) ?? null,
      pickupHub: db.hubs.find((h) => h.id === r.pickupHubId) ?? null,
      dropoffHub: db.hubs.find((h) => h.id === r.dropoffHubId) ?? null,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
