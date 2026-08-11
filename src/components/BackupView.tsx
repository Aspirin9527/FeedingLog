import { ChangeEvent, useRef, useState } from 'react';
import { FileDown, FileUp } from 'lucide-react';

interface BackupViewProps {
  recordCount: number;
  onExport: () => void;
  onImport: (content: string) => Promise<void>;
}

export function BackupView({ recordCount, onExport, onImport }: BackupViewProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setError('');
      await onImport(await file.text());
      event.target.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    }
  }

  return (
    <section className="backup-panel">
      <div>
        <p className="eyebrow">本地数据</p>
        <h2>{recordCount} 条喂奶记录</h2>
        <p>建议每周或每月导出一次备份文件，避免浏览器清理数据后丢失历史。</p>
      </div>

      <div className="backup-actions">
        <button className="primary-button" type="button" onClick={onExport}>
          <FileDown size={20} />
          导出备份
        </button>
        <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}>
          <FileUp size={20} />
          导入备份
        </button>
        <input
          ref={inputRef}
          className="file-input"
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
        />
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
