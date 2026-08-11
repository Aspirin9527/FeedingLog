export interface FeedingRecord {
  id: string;
  fedAt: string;
  amountMl: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailySummary {
  date: string;
  totalMl: number;
  count: number;
  records: FeedingRecord[];
}

export interface FeedingBackup {
  schemaVersion: 1;
  exportedAt: string;
  records: FeedingRecord[];
}
