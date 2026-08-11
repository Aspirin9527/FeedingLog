import { Clock, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { createFeedingRecord, getDateKey, getRecordsForDate, validateAmountMl } from '../domain/feeding';
import type { DailySummary, FeedingRecord } from '../types';

interface HomeViewProps {
  now: () => string;
  records: FeedingRecord[];
  todaySummary: DailySummary;
  onAddRecord: (record: FeedingRecord) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
}

const quickAmounts = [50, 75, 100, 125, 150];

export function HomeView({ now, records, todaySummary, onAddRecord, onDeleteRecord }: HomeViewProps) {
  const [amount, setAmount] = useState('100');
  const [fedAt, setFedAt] = useState(toDateTimeLocal(now()));
  const [error, setError] = useState('');
  const todayRecords = useMemo(
    () => getRecordsForDate(records, getDateKey(now())),
    [now, records],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateAmountMl(amount);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setError('');
    await onAddRecord(
      createFeedingRecord(
        {
          amountMl: validation.value,
          fedAt: new Date(fedAt).toISOString(),
        },
        now(),
      ),
    );
    setFedAt(toDateTimeLocal(now()));
  }

  return (
    <div className="home-grid">
      <section className="summary-panel">
        <div>
          <p className="eyebrow">今日总奶量</p>
          <strong>{todaySummary.totalMl} ml</strong>
        </div>
        <div>
          <p className="eyebrow">今日次数</p>
          <strong>{todaySummary.count} 次</strong>
        </div>
      </section>

      <section className="record-panel" aria-labelledby="record-title">
        <div className="section-heading">
          <h2 id="record-title">记录喂奶</h2>
          <Clock size={20} aria-hidden="true" />
        </div>
        <form onSubmit={submit} className="record-form">
          <label>
            <span>奶量</span>
            <div className="amount-input">
              <input
                aria-label="奶量"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <span>ml</span>
            </div>
          </label>

          <div className="quick-amounts" aria-label="常用奶量">
            {quickAmounts.map((value) => (
              <button key={value} type="button" onClick={() => setAmount(String(value))}>
                {value}
              </button>
            ))}
          </div>

          <label>
            <span>喂奶时间</span>
            <input
              aria-label="喂奶时间"
              type="datetime-local"
              value={fedAt}
              onChange={(event) => setFedAt(event.target.value)}
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="primary-button" type="submit">
            <Plus size={20} />
            记录喂奶
          </button>
        </form>
      </section>

      <section className="timeline-panel" aria-labelledby="today-title">
        <div className="section-heading">
          <h2 id="today-title">今日明细</h2>
          <span>{todayRecords.length} 条</span>
        </div>
        <RecordList records={todayRecords} onDeleteRecord={onDeleteRecord} emptyText="今天还没有记录" />
      </section>
    </div>
  );
}

export function RecordList({
  records,
  onDeleteRecord,
  emptyText,
}: {
  records: FeedingRecord[];
  onDeleteRecord: (id: string) => Promise<void>;
  emptyText: string;
}) {
  if (records.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <ul className="record-list">
      {records.map((record) => (
        <li key={record.id}>
          <div>
            <time>{formatTime(record.fedAt)}</time>
            <strong>{record.amountMl} ml</strong>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label={`删除 ${record.amountMl} ml 记录`}
            title="删除记录"
            onClick={() => onDeleteRecord(record.id)}
          >
            <Trash2 size={18} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function toDateTimeLocal(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatTime(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoTimestamp));
}
