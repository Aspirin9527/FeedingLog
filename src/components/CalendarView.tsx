import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getRecordsForDate } from '../domain/feeding';
import type { DailySummary, FeedingRecord } from '../types';
import { RecordList } from './HomeView';

interface CalendarViewProps {
  records: FeedingRecord[];
  summaries: DailySummary[];
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  onDeleteRecord: (id: string) => Promise<void>;
}

export function CalendarView({
  records,
  summaries,
  selectedDate,
  onSelectedDateChange,
  onDeleteRecord,
}: CalendarViewProps) {
  const [visibleMonth, setVisibleMonth] = useState(selectedDate.slice(0, 7));
  const summariesByDate = useMemo(
    () => new Map(summaries.map((summary) => [summary.date, summary])),
    [summaries],
  );
  const selectedRecords = getRecordsForDate(records, selectedDate);

  function shiftMonth(delta: number) {
    const [year, month] = visibleMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    setVisibleMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div className="calendar-layout">
      <section className="calendar-panel">
        <div className="calendar-header">
          <button className="icon-button" type="button" title="上个月" onClick={() => shiftMonth(-1)}>
            <ChevronLeft size={20} />
          </button>
          <h2>{visibleMonth}</h2>
          <button className="icon-button" type="button" title="下个月" onClick={() => shiftMonth(1)}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="weekday-row">
          {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="calendar-grid">
          {buildMonthCells(visibleMonth).map((date, index) => {
            if (!date) {
              return <span className="calendar-empty" key={`empty-${index}`} />;
            }
            const summary = summariesByDate.get(date);
            return (
              <button
                key={date}
                className={date === selectedDate ? 'calendar-day selected' : 'calendar-day'}
                type="button"
                onClick={() => onSelectedDateChange(date)}
              >
                <span>{Number(date.slice(8, 10))}</span>
                <strong className="calendar-day-total">
                  {summary ? (
                    <>
                      <span className="calendar-day-total-value">{summary.totalMl}</span>
                      <span className="calendar-day-total-unit">ml</span>
                    </>
                  ) : null}
                </strong>
              </button>
            );
          })}
        </div>
      </section>

      <section className="detail-panel">
        <p className="eyebrow">选中日期</p>
        <h2>{selectedDate}</h2>
        <div className="daily-total">
          <span>总奶量</span>
          <strong>{summariesByDate.get(selectedDate)?.totalMl ?? 0} ml</strong>
        </div>
        <RecordList records={selectedRecords} onDeleteRecord={onDeleteRecord} emptyText="这一天还没有记录" />
      </section>
    </div>
  );
}

function buildMonthCells(monthKey: string): Array<string | null> {
  const [year, month] = monthKey.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const mondayBasedOffset = (first.getDay() + 6) % 7;
  const cells: Array<string | null> = Array.from({ length: mondayBasedOffset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}
