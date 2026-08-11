import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { FeedingStore } from './feedingStore';
import type { FeedingRecord } from '../types';

describe('FeedingStore', () => {
  const dbNames: string[] = [];

  afterEach(async () => {
    await Promise.all(dbNames.map((name) => deleteDatabase(name)));
    dbNames.length = 0;
  });

  it('saves and reads records sorted by feeding time', async () => {
    const store = newStore();
    await store.save(record('later', '2026-08-11T03:00:00.000Z', 120));
    await store.save(record('earlier', '2026-08-11T01:00:00.000Z', 80));

    const records = await store.getAll();

    expect(records.map((item) => item.id)).toEqual(['earlier', 'later']);
  });

  it('deletes a record by id', async () => {
    const store = newStore();
    await store.save(record('keep', '2026-08-11T01:00:00.000Z', 80));
    await store.save(record('delete', '2026-08-11T02:00:00.000Z', 90));

    await store.delete('delete');

    expect((await store.getAll()).map((item) => item.id)).toEqual(['keep']);
  });

  it('replaces all local records', async () => {
    const store = newStore();
    await store.save(record('old', '2026-08-11T01:00:00.000Z', 80));

    await store.replaceAll([record('new', '2026-08-12T01:00:00.000Z', 100)]);

    expect((await store.getAll()).map((item) => item.id)).toEqual(['new']);
  });

  function newStore(): FeedingStore {
    const dbName = `feeding-test-${crypto.randomUUID()}`;
    dbNames.push(dbName);
    return new FeedingStore(dbName);
  }
});

function record(id: string, fedAt: string, amountMl: number): FeedingRecord {
  return {
    id,
    fedAt,
    amountMl,
    createdAt: fedAt,
    updatedAt: fedAt,
  };
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
  });
}
