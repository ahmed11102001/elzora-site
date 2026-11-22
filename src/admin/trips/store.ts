import "server-only";
// Storage seam for trips. With ADMIN_DATABASE_URL / DATABASE_URL set, the dashboard uses the Postgres
// store (postgres-store.ts, tables from db/migrations/0002 + 0003). Without it, an in-memory store keeps local
// review working and the dashboard shows a "not saved" warning. Nothing outside this file chooses.
import { adminDatabaseConfigured } from "../db/sql";
import { postgresTripStore } from "./postgres-store";
import { seedRecords } from "./seed";
import type { Locale, TripRecord } from "./model";

export interface TripStore {
  /** False for the in-memory store: the dashboard shows a warning so nobody trusts it with real work. */
  readonly persistent: boolean;
  list(): Promise<TripRecord[]>;
  get(id: string): Promise<TripRecord | null>;
  /** Inserts a new record. Returns false when the id already exists. */
  insert(record: TripRecord): Promise<boolean>;
  /** Replaces a record. Returns false when it no longer exists. */
  replace(record: TripRecord): Promise<boolean>;
  remove(id: string): Promise<boolean>;
  /** True when another trip (not `exceptId`) already uses this slug in this language. */
  slugTaken(locale: Locale, slug: string, exceptId?: string): Promise<boolean>;
}

const GLOBAL_KEY = Symbol.for("elzora.admin.tripStore");
type Holder = { [GLOBAL_KEY]?: Map<string, TripRecord> };

function memory(): Map<string, TripRecord> {
  // Survives dev hot reloads. On serverless hosting every instance has its own copy: fine for review,
  // not for real data, which is exactly what 7.4C fixes.
  const holder = globalThis as unknown as Holder;
  if (!holder[GLOBAL_KEY]) {
    holder[GLOBAL_KEY] = new Map(seedRecords().map((record) => [record.id, record]));
  }
  return holder[GLOBAL_KEY];
}

const clone = <T>(value: T): T => structuredClone(value);

const memoryStore: TripStore = {
  persistent: false,
  async list() {
    return [...memory().values()].map(clone);
  },
  async get(id) {
    const found = memory().get(id);
    return found ? clone(found) : null;
  },
  async insert(record) {
    const map = memory();
    if (map.has(record.id)) return false;
    map.set(record.id, clone(record));
    return true;
  },
  async replace(record) {
    const map = memory();
    if (!map.has(record.id)) return false;
    map.set(record.id, clone(record));
    return true;
  },
  async remove(id) {
    return memory().delete(id);
  },
  async slugTaken(locale, slug, exceptId) {
    for (const record of memory().values()) {
      if (record.id === exceptId) continue;
      if (record.translations[locale]?.slug === slug) return true;
    }
    return false;
  },
};

export function getTripStore(): TripStore {
  if (adminDatabaseConfigured()) return postgresTripStore;
  // Real deployments must never fall back silently to throw-away data.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MEMORY_TRIP_STORE !== "true")
    throw new Error("The dashboard needs ADMIN_DATABASE_URL or DATABASE_URL in production.");
  return memoryStore;
}
