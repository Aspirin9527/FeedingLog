import type { DailySummary, FeedingBackup, FeedingRecord } from '../types';

export type AmountValidation =
  | { ok: true; value: number }
  | { ok: false; message: string };

export function validateAmountMl(input: string): AmountValidation {
  const trimmed = input.trim();
  if (!trimmed || Number.isNaN(Number(trimmed))) {
    return { ok: false, message: '请输入有效的奶量' };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message: '奶量必须是整数' };
  }

  const value = Number(trimmed);
  if (value <= 0) {
    return { ok: false, message: '请输入大于 0 的奶量' };
  }

  return { ok: true, value };
}

export function createFeedingRecord(
  input: { amountMl: number; fedAt: string },
  now = new Date().toISOString(),
): FeedingRecord {
  return {
    id: `feed_${now.replace(/\W/g, '')}_${randomIdPart()}`,
    fedAt: input.fedAt,
    amountMl: input.amountMl,
    createdAt: now,
    updatedAt: now,
  };
}

export function getDateKey(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function summarizeByDay(records: FeedingRecord[]): DailySummary[] {
  const summaries = new Map<string, DailySummary>();

  records
    .slice()
    .sort((a, b) => a.fedAt.localeCompare(b.fedAt))
    .forEach((record) => {
      const date = getDateKey(record.fedAt);
      const summary = summaries.get(date) ?? {
        date,
        totalMl: 0,
        count: 0,
        records: [],
      };

      summary.totalMl += record.amountMl;
      summary.count += 1;
      summary.records.push(record);
      summaries.set(date, summary);
    });

  return Array.from(summaries.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function getRecordsForDate(records: FeedingRecord[], date: string): FeedingRecord[] {
  return records
    .filter((record) => getDateKey(record.fedAt) === date)
    .sort((a, b) => b.fedAt.localeCompare(a.fedAt));
}

export function buildBackup(records: FeedingRecord[], exportedAt = new Date().toISOString()): FeedingBackup {
  return {
    schemaVersion: 1,
    exportedAt,
    records: records.slice().sort((a, b) => a.fedAt.localeCompare(b.fedAt)),
  };
}

export function parseBackup(content: string): FeedingRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('备份文件无法读取');
  }

  if (!isBackup(parsed)) {
    throw new Error('备份文件格式不正确');
  }

  return parsed.records;
}

export function mergeImportedRecords(
  existing: FeedingRecord[],
  imported: FeedingRecord[],
): FeedingRecord[] {
  const byId = new Map<string, FeedingRecord>();

  existing.forEach((record) => {
    byId.set(record.id, record);
  });

  imported.forEach((record) => {
    const current = byId.get(record.id);
    if (!current || record.updatedAt > current.updatedAt) {
      byId.set(record.id, record);
    }
  });

  return Array.from(byId.values()).sort((a, b) => a.fedAt.localeCompare(b.fedAt));
}

function isBackup(value: unknown): value is FeedingBackup {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const backup = value as FeedingBackup;
  return (
    backup.schemaVersion === 1 &&
    typeof backup.exportedAt === 'string' &&
    Array.isArray(backup.records) &&
    backup.records.every(isFeedingRecord)
  );
}

function isFeedingRecord(value: unknown): value is FeedingRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as FeedingRecord;
  return (
    typeof record.id === 'string' &&
    typeof record.fedAt === 'string' &&
    Number.isInteger(record.amountMl) &&
    record.amountMl > 0 &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  );
}

function randomIdPart(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}
