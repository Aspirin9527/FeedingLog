import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

const accountPattern = /^[a-z0-9_]{3,32}$/;
const authEmailDomain = 'feedinglog.local';

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

export function accountToAuthEmail(account: string): string {
  const normalizedAccount = normalizeAccount(account);
  validateAccount(normalizedAccount);
  return `${normalizedAccount}@${authEmailDomain}`;
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

  async registerWithAccount(account: string, password: string): Promise<Session | null> {
    validatePassword(password);
    const normalizedAccount = normalizeAccount(account);
    const email = accountToAuthEmail(normalizedAccount);
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          account: normalizedAccount,
        },
      },
    });

    if (error) {
      throw normalizeAuthError(error);
    }

    return data.session;
  }

  async signInWithAccount(account: string, password: string): Promise<Session | null> {
    validatePassword(password);
    const { data, error } = await this.client.auth.signInWithPassword({
      email: accountToAuthEmail(account),
      password,
    });

    if (error) {
      throw new Error('账号或密码错误');
    }

    return data.session;
  }

  async resetUserPasswordAsAdmin(account: string, password: string): Promise<void> {
    validatePassword(password);
    const normalizedAccount = normalizeAccount(account);
    validateAccount(normalizedAccount);

    const { error } = await this.client.functions.invoke('admin-reset-password', {
      body: {
        account: normalizedAccount,
        password,
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

function normalizeAccount(account: string): string {
  return account.trim().toLowerCase();
}

function validateAccount(account: string): void {
  if (!accountPattern.test(account)) {
    throw new Error('账号只能使用 3-32 位字母、数字或下划线');
  }
}

function validatePassword(password: string): void {
  if (password.length < 6) {
    throw new Error('密码至少需要 6 位');
  }
}

function normalizeAuthError(error: Error): Error {
  const message = error.message.toLowerCase();
  if (message.includes('registered') || message.includes('already') || message.includes('duplicate')) {
    return new Error('账号已存在');
  }

  return error;
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
