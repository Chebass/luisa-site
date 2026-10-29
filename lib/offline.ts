import type { Store } from "./types";
import { dateKey, shiftDay } from "./dates";
const DATABASE = "luisa-private-agenda";
let generation = 0;
let enabled = false;
export function enableOfflineAgenda() {
  enabled = true;
}
const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(DATABASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("private");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
export async function clearOfflineAgenda() {
  generation++;
  enabled = false;
  if (!("indexedDB" in window)) return;
  try {
    const db = await open();
    const transaction = db.transaction("private", "readwrite");
    transaction.objectStore("private").clear();
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  } catch {
    /* Storage might be disabled. */
  }
}
export async function saveOfflineAgenda(store: Store) {
  if (!enabled || !("indexedDB" in window) || !crypto.subtle) return;
  const version = generation;
  try {
    const today = dateKey();
    const appointments = store.appointments
      .filter(
        (a) =>
          dateKey(a.start_at) >= today &&
          dateKey(a.start_at) < shiftDay(today, 14) &&
          a.status !== "cancelled",
      )
      .map((a) => ({
        name:
          store.clients.find((c) => c.id === a.client_id)?.name ?? "Cliente",
        start_at: a.start_at,
        end_at: a.end_at,
        status: a.status,
      }));
    const snapshot = {
      savedAt: new Date().toISOString(),
      expiresAt: Date.now() + 12 * 3600000,
      owner: store.settings.owner_name,
      appointments,
    };
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(JSON.stringify(snapshot)),
    );
    const db = await open();
    if (!enabled || generation !== version) {
      db.close();
      return;
    }
    const transaction = db.transaction("private", "readwrite");
    const storage = transaction.objectStore("private");
    storage.put({ key, iv, encrypted }, "agenda");
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  } catch {
    /* Offline support must not block the live agenda. */
  }
}
