import type { StateStorage } from 'zustand/middleware';

let database: Promise<IDBDatabase> | undefined;
function open(): Promise<IDBDatabase> {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('hairtwin-local', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(request.error); };
  });
}
async function operation<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', mode), request = work(tx.objectStore('state'));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
// Image drafts exceed localStorage quotas. IndexedDB commits each snapshot atomically.
export const indexedStorage: StateStorage = {
  getItem: async name => {
    try { return await operation('readonly', s => s.get(name)) ?? null; } catch { return null; }
  },
  setItem: async (name, value) => { await operation('readwrite', s => s.put(value, name)); },
  removeItem: async name => { await operation('readwrite', s => s.delete(name)); },
};
