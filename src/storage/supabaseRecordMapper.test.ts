import { describe, expect, it } from 'vitest';
import {
  feedingRecordToRow,
  rowToFeedingRecord,
  sortFeedingRecords,
  type FeedingRecordRow,
} from './supabaseRecordMapper';
import type { FeedingRecord } from '../types';

describe('supabase record mapper', () => {
  it('maps database rows into app feeding records', () => {
    const row: FeedingRecordRow = {
      id: 'feed-1',
      family_id: 'family-1',
      fed_at: '2026-08-11T03:00:00.000Z',
      amount_ml: 120,
      created_at: '2026-08-11T02:00:00.000Z',
      updated_at: '2026-08-11T04:00:00.000Z',
      deleted_at: null,
      created_by: 'user-1',
      updated_by: 'user-2',
    };

    expect(rowToFeedingRecord(row)).toEqual({
      id: 'feed-1',
      fedAt: '2026-08-11T03:00:00.000Z',
      amountMl: 120,
      createdAt: '2026-08-11T02:00:00.000Z',
      updatedAt: '2026-08-11T04:00:00.000Z',
    });
  });

  it('maps app feeding records into family scoped database rows', () => {
    const record: FeedingRecord = {
      id: 'feed-1',
      fedAt: '2026-08-11T03:00:00.000Z',
      amountMl: 120,
      createdAt: '2026-08-11T02:00:00.000Z',
      updatedAt: '2026-08-11T04:00:00.000Z',
    };

    expect(feedingRecordToRow(record, 'family-1', 'user-1')).toEqual({
      id: 'feed-1',
      family_id: 'family-1',
      fed_at: '2026-08-11T03:00:00.000Z',
      amount_ml: 120,
      created_at: '2026-08-11T02:00:00.000Z',
      updated_at: '2026-08-11T04:00:00.000Z',
      deleted_at: null,
      created_by: 'user-1',
      updated_by: 'user-1',
    });
  });

  it('sorts feeding records by feeding time', () => {
    expect(
      sortFeedingRecords([
        record('later', '2026-08-11T04:00:00.000Z'),
        record('earlier', '2026-08-11T02:00:00.000Z'),
      ]).map((item) => item.id),
    ).toEqual(['earlier', 'later']);
  });
});

function record(id: string, fedAt: string): FeedingRecord {
  return {
    id,
    fedAt,
    amountMl: 100,
    createdAt: fedAt,
    updatedAt: fedAt,
  };
}
