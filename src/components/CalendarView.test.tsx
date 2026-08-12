import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalendarView } from './CalendarView';
import type { DailySummary, FeedingRecord } from '../types';

describe('CalendarView', () => {
  it('renders calendar totals with separate value and unit elements', () => {
    const summaries: DailySummary[] = [
      {
        date: '2026-08-11',
        totalMl: 100,
        count: 1,
        records: [record('feed-1', '2026-08-11T03:00:00.000Z', 100)],
      },
    ];

    const { container } = render(
      <CalendarView
        records={summaries[0].records}
        summaries={summaries}
        selectedDate="2026-08-11"
        onSelectedDateChange={() => undefined}
        onDeleteRecord={async () => undefined}
      />,
    );

    const total = Array.from(container.querySelectorAll('.calendar-day-total')).find((item) =>
      item.textContent?.includes('100ml'),
    );

    expect(total?.querySelector('.calendar-day-total-value')).toHaveTextContent('100');
    expect(total?.querySelector('.calendar-day-total-unit')).toHaveTextContent('ml');
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
