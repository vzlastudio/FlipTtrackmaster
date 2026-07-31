import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "FlipTrackDB";
const DB_VERSION = 1;

export type StoreName =
  | "flips"
  | "transactions"
  | "clients"
  | "documents"
  | "settings"
  | "auditEvents"
  | "tiendas"
  | "escaneos";

const ALL_STORES: StoreName[] = [
  "flips",
  "transactions",
  "clients",
  "documents",
  "settings",
  "auditEvents",
  "tiendas",
  "escaneos",
];

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const store of ALL_STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    },
  });
  return dbInstance;
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await getDB();
  return db.getAll(store);
}

export async function getById<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(store, id);
}

export async function save<T extends { id: string }>(
  store: StoreName,
  item: T
): Promise<void> {
  const db = await getDB();
  await db.put(store, item);
}

export async function saveMany<T extends { id: string }>(
  store: StoreName,
  items: T[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(store, "readwrite");
  for (const item of items) {
    await tx.store.put(item);
  }
  await tx.done;
}

export async function deleteItem(store: StoreName, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(store, id);
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await getDB();
  await db.clear(store);
}

export function generateUUID(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function registerEvent(
  detalle: string,
  tipo: string = "general"
): Promise<void> {
  const event = {
    id: generateUUID(),
    timestamp: new Date().toISOString(),
    detalle,
    tipo,
  };
  await save("auditEvents", event);
}

export async function seedInitialDataIfEmpty<T extends { id: string }>(
  store: StoreName,
  initialData: T[]
): Promise<boolean> {
  const flagKey = `semillaInicial_${store}`;
  if (localStorage.getItem(flagKey)) return false;

  const existing = await getAll<T>(store);
  if (existing.length > 0) return false;

  await saveMany(store, initialData);
  localStorage.setItem(flagKey, "true");
  return true;
}