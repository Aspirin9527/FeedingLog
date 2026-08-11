import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App, { type FeedingStoreApi } from './App';
import type { FeedingRecord } from './types';

describe('App', () => {
  it('shows the requested default milk amount presets', async () => {
    const store = new MemoryStore();

    render(<App store={store} now={() => '2026-08-11T08:00:00.000Z'} />);

    await screen.findByText('今日总奶量');

    expect(screen.getByLabelText('奶量')).toHaveValue('100');
    ['50', '75', '100', '125', '150'].forEach((amount) => {
      expect(screen.getByRole('button', { name: amount })).toBeInTheDocument();
    });
    ['60', '90', '120', '180'].forEach((amount) => {
      expect(screen.queryByRole('button', { name: amount })).not.toBeInTheDocument();
    });
  });

  it('records and deletes a feeding entry from the home screen', async () => {
    const user = userEvent.setup();
    const store = new MemoryStore();

    render(<App store={store} now={() => '2026-08-11T08:00:00.000Z'} />);

    await screen.findByText('今日总奶量');
    await user.clear(screen.getByLabelText('奶量'));
    await user.type(screen.getByLabelText('奶量'), '120');
    await user.click(screen.getByRole('button', { name: '记录喂奶' }));

    await waitFor(() => expect(screen.getAllByText('120 ml').length).toBeGreaterThanOrEqual(2));
    expect(screen.getByText('1 次')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '删除 120 ml 记录' }));

    await waitFor(() => expect(screen.getByText('0 ml')).toBeInTheDocument());
    expect(screen.getByText('0 次')).toBeInTheDocument();
  });
});

class MemoryStore implements FeedingStoreApi {
  private records: FeedingRecord[] = [];

  async getAll(): Promise<FeedingRecord[]> {
    return this.records.slice();
  }

  async save(record: FeedingRecord): Promise<void> {
    this.records = this.records.filter((item) => item.id !== record.id).concat(record);
  }

  async delete(id: string): Promise<void> {
    this.records = this.records.filter((item) => item.id !== id);
  }

  async replaceAll(records: FeedingRecord[]): Promise<void> {
    this.records = records.slice();
  }
}
