import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
}

interface FamilyRow {
  id: string;
  name: string;
  invite_code: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.anonKey);
}

export class FamilyService {
  constructor(private readonly client: SupabaseClient) {}

  async getSession(): Promise<Session | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw error;
    }

    return data.session;
  }

  onSessionChange(onChange: (session: Session | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      onChange(session);
    });

    return () => data.subscription.unsubscribe();
  }

  async sendSignInLink(email: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      throw error;
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw error;
    }
  }

  async getFamilies(): Promise<Family[]> {
    const { data, error } = await this.client
      .from('families')
      .select('id,name,invite_code')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return ((data ?? []) as FamilyRow[]).map(rowToFamily);
  }

  async createFamily(userId: string, name: string): Promise<Family> {
    const { data, error } = await this.client.rpc('create_family', {
      name_arg: name,
      invite_code_arg: createInviteCode(),
    });

    if (error) {
      throw error;
    }

    return rowToFamily(normalizeRpcFamily(data));
  }

  async joinFamily(userId: string, inviteCode: string): Promise<Family> {
    const normalizedInviteCode = inviteCode.trim().toUpperCase();
    const { data, error } = await this.client.rpc('join_family_by_invite', {
      invite_code_arg: normalizedInviteCode,
    });

    if (error) {
      throw error;
    }

    return rowToFamily(normalizeRpcFamily(data));
  }
}

function rowToFamily(row: FamilyRow): Family {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
  };
}

function normalizeRpcFamily(data: unknown): FamilyRow {
  if (Array.isArray(data)) {
    return data[0] as FamilyRow;
  }

  return data as FamilyRow;
}

function createInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = new Uint8Array(8);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(values);
  } else {
    values.forEach((_value, index) => {
      values[index] = Math.floor(Math.random() * 256);
    });
  }

  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}
