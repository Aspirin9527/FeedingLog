import { describe, expect, it } from 'vitest';
import {
  buildBackup,
  createFeedingRecord,
  getDateKey,
  getRecordsForDate,
  mergeImportedRecords,
  parseBackup,
  summarizeByDay,
  validateAmountMl,
} from './feeding';
import type { FeedingRecord } from '../types';

describe('feeding domain', () => {
  it('creates a feeding record with stable timestamps and amount', () => {
    const now = '2026-08-11T04:00:00.000Z';

    const record = createFeedingRecord(
      { amountMl: 120, fedAt: '2026-08-11T03:00:00.000Z' },
      now,
    );

    expect(record.amountMl).toBe(120);
    expect(record.fedAt).toBe('2026-08-11T03:00:00.000Z');
    expect(record.createdAt).toBe(now);
    expect(record.updatedAt).toBe(now);
    expect(record.id).toMatch(/^feed_/);
  });

  it('validates milk amounts as positive whole milliliters', () => {
    expect(validateAmountMl('120')).toEqual({ ok: true, value: 120 });
    expect(validateAmountMl('0')).toEqual({ ok: false, message: '请输入大于 0 的奶量' });
    expect(validateAmountMl('12.5')).toEqual({ ok: false, message: '奶量必须是整数' });
    expect(validateAmountMl('abc')).toEqual({ ok: false, message: '请输入有效的奶量' });
  });

  it('formats local date keys from ISO timestamps', () => {
    expect(getDateKey('2026-08-11T03:30:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('summarizes records by local day', () => {
    const records: FeedingRecord[] = [
      record('a', '2026-08-11T01:00:00.000Z', 80),
      record('b', '2026-08-11T05:00:00.000Z', 120),
      record('c', '2026-08-12T01:00:00.000Z', 90),
    ];

    const summaries = summarizeByDay(records);

    expect(summaries).toHaveLength(2);
    expect(summaries[0].totalMl).toBe(200);
    expect(summaries[0].count).toBe(2);
    expect(summaries[0].records.map((item) => item.id)).toEqual(['a', 'b']);
    expect(summaries[1].totalMl).toBe(90);
  });

  it('returns records for a selected date sorted by feeding time descending', () => {
    const records: FeedingRecord[] = [
      record('early', '2026-08-11T01:00:00.000Z', 80),
      record('late', '2026-08-11T05:00:00.000Z', 120),
      record('other', '2026-08-12T01:00:00.000Z', 90),
    ];
    const date = getDateKey('2026-08-11T01:00:00.000Z');

    expect(getRecordsForDate(records, date).map((item) => item.id)).toEqual(['late', 'early']);
  });

  it('builds and parses a versioned backup', () => {
    const records = [record('a', '2026-08-11T01:00:00.000Z', 80)];
    const backup = buildBackup(records, '2026-08-11T08:00:00.000Z');

    expect(backup).toEqual({
      schemaVersion: 1,
      exportedAt: '2026-08-11T08:00:00.000Z',
      records,
    });
    expect(parseBackup(JSON.stringify(backup))).toEqual(records);
  });

  it('rejects invalid backup content', () => {
    expect(() => parseBackup('{"schemaVersion":2,"records":[]}')).toThrow('备份文件格式不正确');
    expect(() => parseBackup('not json')).toThrow('备份文件无法读取');
  });

  it('merges imported records by id and keeps newer updates', () => {
    const existing = [
      { ...record('same', '2026-08-11T01:00:00.000Z', 80), updatedAt: '2026-08-11T02:00:00.000Z' },
      record('local', '2026-08-11T03:00:00.000Z', 100),
    ];
    const imported = [
      { ...record('same', '2026-08-11T01:00:00.000Z', 120), updatedAt: '2026-08-11T04:00:00.000Z' },
      record('imported', '2026-08-11T05:00:00.000Z', 90),
    ];

    const merged = mergeImportedRecords(existing, imported);

    expect(merged.map((item) => item.id).sort()).toEqual(['imported', 'local', 'same']);
    expect(merged.find((item) => item.id === 'same')?.amountMl).toBe(120);
  });
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
