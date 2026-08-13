import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import App from './App';
import {
  createSupabaseClient,
  FamilyService,
  getSupabaseConfig,
  type Family,
} from './cloud/familyService';
import { SupabaseFeedingStore } from './storage/supabaseFeedingStore';

const selectedFamilyStorageKey = 'baby-feeding-selected-family';

export function CloudApp() {
  const config = getSupabaseConfig();

  if (!config) {
    return <App />;
  }

  return <ConfiguredCloudApp config={config} />;
}

function ConfiguredCloudApp({ config }: { config: NonNullable<ReturnType<typeof getSupabaseConfig>> }) {
  const client = useMemo(() => createSupabaseClient(config), [config.anonKey, config.url]);

  return <CloudEnabledApp client={client} />;
}

function CloudEnabledApp({ client }: { client: SupabaseClient }) {
  const familyService = useMemo(() => new FamilyService(client), [client]);
  const [session, setSession] = useState<Session | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState(
    () => localStorage.getItem(selectedFamilyStorageKey) ?? '',
  );
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    familyService
      .getSession()
      .then((currentSession) => {
        if (mounted) {
          setSession(currentSession);
        }
      })
      .catch(() => setMessage('云端登录状态读取失败'))
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    const unsubscribe = familyService.onSessionChange((nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [familyService]);

  useEffect(() => {
    if (!session) {
      setFamilies([]);
      setSelectedFamilyId('');
      localStorage.removeItem(selectedFamilyStorageKey);
      return;
    }

    familyService
      .getFamilies()
      .then((items) => {
        setFamilies(items);
        if (!items.some((family) => family.id === selectedFamilyId)) {
          const firstFamilyId = items[0]?.id ?? '';
          updateSelectedFamily(firstFamilyId);
        }
      })
      .catch(() => setMessage('家庭数据读取失败'));
  }, [familyService, selectedFamilyId, session]);

  const selectedFamily = useMemo(
    () => families.find((family) => family.id === selectedFamilyId),
    [families, selectedFamilyId],
  );
  const store = useMemo(() => {
    if (!session || !selectedFamily) {
      return null;
    }

    return new SupabaseFeedingStore(client, selectedFamily.id, session.user.id);
  }, [client, selectedFamily, session]);

  function updateSelectedFamily(familyId: string) {
    setSelectedFamilyId(familyId);
    if (familyId) {
      localStorage.setItem(selectedFamilyStorageKey, familyId);
    } else {
      localStorage.removeItem(selectedFamilyStorageKey);
    }
  }

  async function refreshFamilies(nextSelectedFamilyId?: string) {
    const items = await familyService.getFamilies();
    setFamilies(items);
    if (nextSelectedFamilyId) {
      updateSelectedFamily(nextSelectedFamilyId);
    }
  }

  if (isLoading) {
    return <CloudPanel title="正在连接云端">请稍候</CloudPanel>;
  }

  if (!session) {
    return (
      <AuthPanel
        message={message}
        onSendCode={async (email) => {
          await familyService.sendEmailCode(email);
          setMessage('验证码已发送，请查看邮箱');
        }}
        onVerifyCode={async (email, token) => {
          await familyService.verifyEmailCode(email, token);
        }}
      />
    );
  }

  if (!selectedFamily || !store) {
    return (
      <FamilyPanel
        message={message}
        userId={session.user.id}
        familyService={familyService}
        onFamilyReady={(familyId) => refreshFamilies(familyId)}
        onSignOut={() => familyService.signOut()}
      />
    );
  }

  return (
    <>
      <div className="cloud-toolbar">
        <label>
          <span>家庭</span>
          <select value={selectedFamilyId} onChange={(event) => updateSelectedFamily(event.target.value)}>
            {families.map((family) => (
              <option value={family.id} key={family.id}>
                {family.name}
              </option>
            ))}
          </select>
        </label>
        <span>邀请码：{selectedFamily.inviteCode}</span>
        <button className="secondary-button" type="button" onClick={() => familyService.signOut()}>
          退出
        </button>
      </div>
      <App key={selectedFamily.id} store={store} />
    </>
  );
}

export function AuthPanel({
  message,
  onSendCode,
  onVerifyCode,
}: {
  message: string;
  onSendCode: (email: string) => Promise<void>;
  onVerifyCode: (email: string, token: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [hasSentCode, setHasSentCode] = useState(false);
  const [error, setError] = useState('');

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setError('');
      await onSendCode(email);
      setHasSentCode(true);
    } catch {
      setError('验证码发送失败，请稍后重试');
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setError('');
      await onVerifyCode(email, token);
    } catch {
      setError('验证码错误或已过期');
    }
  }

  return (
    <CloudPanel title="登录后同步家庭记录">
      <form className="cloud-form" onSubmit={hasSentCode ? verifyCode : sendCode}>
        <label>
          <span>邮箱</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>

        {hasSentCode ? (
          <label>
            <span>验证码</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={token}
              onChange={(event) => setToken(event.target.value.trim())}
              required
            />
          </label>
        ) : null}

        <button className="primary-button" type="submit">
          {hasSentCode ? '登录' : '发送验证码'}
        </button>

        {hasSentCode ? (
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setToken('');
              setHasSentCode(false);
              setError('');
            }}
          >
            重新发送验证码
          </button>
        ) : null}

        {message ? <p className="status-message">{message}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </form>
    </CloudPanel>
  );
}

function FamilyPanel({
  message,
  userId,
  familyService,
  onFamilyReady,
  onSignOut,
}: {
  message: string;
  userId: string;
  familyService: FamilyService;
  onFamilyReady: (familyId: string) => void;
  onSignOut: () => Promise<void>;
}) {
  const [familyName, setFamilyName] = useState('我的家庭');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  async function createFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setError('');
      const family = await familyService.createFamily(userId, familyName);
      onFamilyReady(family.id);
    } catch {
      setError('创建家庭失败');
    }
  }

  async function joinFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setError('');
      const family = await familyService.joinFamily(userId, inviteCode);
      onFamilyReady(family.id);
    } catch {
      setError('加入家庭失败，请检查邀请码');
    }
  }

  return (
    <CloudPanel title="选择家庭">
      <div className="family-actions">
        <form className="cloud-form" onSubmit={createFamily}>
          <label>
            <span>家庭名称</span>
            <input value={familyName} onChange={(event) => setFamilyName(event.target.value)} required />
          </label>
          <button className="primary-button" type="submit">
            创建家庭
          </button>
        </form>

        <form className="cloud-form" onSubmit={joinFamily}>
          <label>
            <span>家庭邀请码</span>
            <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} required />
          </label>
          <button className="secondary-button" type="submit">
            加入家庭
          </button>
        </form>
      </div>
      <button className="secondary-button" type="button" onClick={onSignOut}>
        退出登录
      </button>
      {message ? <p className="status-message">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </CloudPanel>
  );
}

function CloudPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="app-shell">
      <section className="backup-panel cloud-panel">
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  );
}
