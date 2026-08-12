import type { FeedingRecord } from '../types';

export interface FeedingRecordRow {
  id: string;
  family_id: string;
  fed_at: string;
  amount_ml: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string;
  updated_by: string;
}

export function rowToFeedingRecord(row: FeedingRecordRow): FeedingRecord {
  return {
    id: row.id,
    fedAt: row.fed_at,
    amountMl: row.amount_ml,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function feedingRecordToRow(
  record: FeedingRecord,
  familyId: string,
  userId: string,
): FeedingRecordRow {
  return {
    id: record.id,
    family_id: familyId,
    fed_at: record.fedAt,
    amount_ml: record.amountMl,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    deleted_at: null,
    created_by: userId,
    updated_by: userId,
  };
}

export function sortFeedingRecords(records: FeedingRecord[]): FeedingRecord[] {
  return records.slice().sort((a, b) => a.fedAt.localeCompare(b.fedAt));
}
