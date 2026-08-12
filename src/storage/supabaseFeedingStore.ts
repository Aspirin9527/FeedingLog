import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { FeedingRecord } from '../types';
import {
  feedingRecordToRow,
  rowToFeedingRecord,
  sortFeedingRecords,
  type FeedingRecordRow,
} from './supabaseRecordMapper';
import type { FeedingStoreApi } from './storeTypes';

const TABLE_NAME = 'feeding_records';

export class SupabaseFeedingStore implements FeedingStoreApi {
  constructor(
    private readonly client: SupabaseClient,
    private readonly familyId: string,
    private readonly userId: string,
  ) {}

  async getAll(): Promise<FeedingRecord[]> {
    const { data, error } = await this.client
      .from(TABLE_NAME)
      .select('id,family_id,fed_at,amount_ml,created_at,updated_at,deleted_at,created_by,updated_by')
      .eq('family_id', this.familyId)
      .is('deleted_at', null)
      .order('fed_at', { ascending: true });

    if (error) {
      throw error;
    }

    return sortFeedingRecords(((data ?? []) as FeedingRecordRow[]).map(rowToFeedingRecord));
  }

  async save(record: FeedingRecord): Promise<void> {
    const row = feedingRecordToRow(record, this.familyId, this.userId);
    const { error } = await this.client.from(TABLE_NAME).upsert(row, { onConflict: 'id' });

    if (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.client
      .from(TABLE_NAME)
      .update({
        deleted_at: now,
        updated_at: now,
        updated_by: this.userId,
      })
      .eq('id', id)
      .eq('family_id', this.familyId);

    if (error) {
      throw error;
    }
  }

  async replaceAll(records: FeedingRecord[]): Promise<void> {
    const currentRecords = await this.getAll();
    const incomingIds = new Set(records.map((record) => record.id));
    const deleteIds = currentRecords.map((record) => record.id).filter((id) => !incomingIds.has(id));

    if (deleteIds.length > 0) {
      const now = new Date().toISOString();
      const { error: deleteError } = await this.client
        .from(TABLE_NAME)
        .update({
          deleted_at: now,
          updated_at: now,
          updated_by: this.userId,
        })
        .eq('family_id', this.familyId)
        .in('id', deleteIds);

      if (deleteError) {
        throw deleteError;
      }
    }

    if (records.length > 0) {
      const rows = records.map((record) => feedingRecordToRow(record, this.familyId, this.userId));
      const { error } = await this.client.from(TABLE_NAME).upsert(rows, { onConflict: 'id' });

      if (error) {
        throw error;
      }
    }
  }

  subscribe(onRecordsChange: (records: FeedingRecord[]) => void): () => void {
    let disposed = false;
    const refresh = () => {
      this.getAll()
        .then((records) => {
          if (!disposed) {
            onRecordsChange(records);
          }
        })
        .catch(() => undefined);
    };

    const channel: RealtimeChannel = this.client
      .channel(`feeding-records:${this.familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLE_NAME,
          filter: `family_id=eq.${this.familyId}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      disposed = true;
      void this.client.removeChannel(channel);
    };
  }
}
