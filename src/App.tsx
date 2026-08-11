import { useEffect, useMemo, useState } from 'react';
import { Baby, BarChart3, CalendarDays, Download } from 'lucide-react';
import { BackupView } from './components/BackupView';
import { CalendarView } from './components/CalendarView';
import { HomeView } from './components/HomeView';
import { StatsView } from './components/StatsView';
import { buildBackup, getDateKey, mergeImportedRecords, parseBackup, summarizeByDay } from './domain/feeding';
import { FeedingStore } from './storage/feedingStore';
import type { DailySummary, FeedingRecord } from './types';

type View = 'home' | 'calendar' | 'stats' | 'backup';

export interface FeedingStoreApi {
  getAll(): Promise<FeedingRecord[]>;
  save(record: FeedingRecord): Promise<void>;
  delete(id: string): Promise<void>;
  replaceAll(records: FeedingRecord[]): Promise<void>;
}

interface AppProps {
  store?: FeedingStoreApi;
  now?: () => string;
}

const defaultStore = new FeedingStore();

export default function App({ store = defaultStore, now = () => new Date().toISOString() }: AppProps) {
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [activeView, setActiveView] = useState<View>('home');
  const [selectedDate, setSelectedDate] = useState(getDateKey(now()));
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    store
      .getAll()
      .then((items) => {
        if (isMounted) {
          setRecords(items);
        }
      })
      .catch(() => setMessage('读取本地数据失败，请刷新后重试'))
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [store]);

  const summaries = useMemo(() => summarizeByDay(records), [records]);
  const todaySummary = useMemo(
    () => findSummary(summaries, getDateKey(now())),
    [now, summaries],
  );

  async function addRecord(record: FeedingRecord) {
    await store.save(record);
    setRecords((current) => current.concat(record).sort((a, b) => a.fedAt.localeCompare(b.fedAt)));
    setSelectedDate(getDateKey(record.fedAt));
    setMessage('已记录');
  }

  async function deleteRecord(id: string) {
    await store.delete(id);
    setRecords((current) => current.filter((record) => record.id !== id));
    setMessage('已删除记录');
  }

  function exportBackup() {
    const backup = buildBackup(records, now());
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feeding-backup-${getDateKey(now())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('备份文件已生成');
  }

  async function importBackup(content: string) {
    const imported = parseBackup(content);
    const merged = mergeImportedRecords(records, imported);
    await store.replaceAll(merged);
    setRecords(merged);
    setMessage(`已导入 ${imported.length} 条记录`);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">
          <Baby size={26} />
        </div>
        <div>
          <h1>喂奶记录</h1>
          <p>本地保存，支持导出备份</p>
        </div>
      </header>

      {message ? <div className="status-message">{message}</div> : null}

      <main className="app-main" aria-busy={isLoading}>
        {activeView === 'home' ? (
          <HomeView
            now={now}
            records={records}
            todaySummary={todaySummary}
            onAddRecord={addRecord}
            onDeleteRecord={deleteRecord}
          />
        ) : null}

        {activeView === 'calendar' ? (
          <CalendarView
            records={records}
            summaries={summaries}
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            onDeleteRecord={deleteRecord}
          />
        ) : null}

        {activeView === 'stats' ? <StatsView summaries={summaries} /> : null}

        {activeView === 'backup' ? (
          <BackupView recordCount={records.length} onExport={exportBackup} onImport={importBackup} />
        ) : null}
      </main>

      <nav className="tab-bar" aria-label="主导航">
        <TabButton icon={<Baby size={20} />} label="记录" view="home" activeView={activeView} onClick={setActiveView} />
        <TabButton icon={<CalendarDays size={20} />} label="日历" view="calendar" activeView={activeView} onClick={setActiveView} />
        <TabButton icon={<BarChart3 size={20} />} label="统计" view="stats" activeView={activeView} onClick={setActiveView} />
        <TabButton icon={<Download size={20} />} label="备份" view="backup" activeView={activeView} onClick={setActiveView} />
      </nav>
    </div>
  );
}

function TabButton({
  icon,
  label,
  view,
  activeView,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  view: View;
  activeView: View;
  onClick: (view: View) => void;
}) {
  return (
    <button
      className={activeView === view ? 'tab-button active' : 'tab-button'}
      type="button"
      onClick={() => onClick(view)}
      aria-current={activeView === view ? 'page' : undefined}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function findSummary(summaries: DailySummary[], date: string): DailySummary {
  return summaries.find((summary) => summary.date === date) ?? {
    date,
    totalMl: 0,
    count: 0,
    records: [],
  };
}
