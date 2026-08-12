import type { FeedingRecord } from '../types';

export interface FeedingStoreApi {
  getAll(): Promise<FeedingRecord[]>;
  save(record: FeedingRecord): Promise<void>;
  delete(id: string): Promise<void>;
  replaceAll(records: FeedingRecord[]): Promise<void>;
  subscribe?(onRecordsChange: (records: FeedingRecord[]) => void): () => void;
}
