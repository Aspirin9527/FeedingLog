import type { DailySummary } from '../types';

interface StatsViewProps {
  summaries: DailySummary[];
}

export function StatsView({ summaries }: StatsViewProps) {
  const recent = summaries.slice(-30).reverse();
  const maxTotal = Math.max(1, ...recent.map((summary) => summary.totalMl));

  return (
    <section className="stats-panel">
      <div className="section-heading">
        <h2>每日统计</h2>
        <span>最近 30 天</span>
      </div>

      {recent.length === 0 ? (
        <p className="empty-state">还没有可统计的数据</p>
      ) : (
        <div className="stats-list">
          {recent.map((summary) => (
            <div className="stat-row" key={summary.date}>
              <div>
                <strong>{summary.date}</strong>
                <span>{summary.count} 次</span>
              </div>
              <div className="bar-track" aria-hidden="true">
                <span style={{ width: `${Math.max(8, (summary.totalMl / maxTotal) * 100)}%` }} />
              </div>
              <b>{summary.totalMl} ml</b>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
