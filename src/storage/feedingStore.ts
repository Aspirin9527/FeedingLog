import type { FeedingRecord } from '../types';

const STORE_NAME = 'feeding-records';

export class FeedingStore {
  private readonly dbName: string;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(dbName = 'baby-feeding-tracker') {
    this.dbName = dbName;
  }

  async getAll(): Promise<FeedingRecord[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(
          (request.result as FeedingRecord[]).slice().sort((a, b) => a.fedAt.localeCompare(b.fedAt)),
        );
      };
    });
  }

  async save(record: FeedingRecord): Promise<void> {
    const db = await this.open();
    return this.write(db, (store) => {
      store.put(record);
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.open();
    return this.write(db, (store) => {
      store.delete(id);
    });
  }

  async replaceAll(records: FeedingRecord[]): Promise<void> {
    const db = await this.open();
    return this.write(db, (store) => {
      store.clear();
      records.forEach((record) => store.put(record));
    });
  }

  private open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 1);

        request.onerror = () => reject(request.error);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('fedAt', 'fedAt', { unique: false });
          }
        };
        request.onsuccess = () => resolve(request.result);
      });
    }

    return this.dbPromise;
  }

  private write(db: IDBDatabase, action: (store: IDBObjectStore) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      action(store);
    });
  }
}
