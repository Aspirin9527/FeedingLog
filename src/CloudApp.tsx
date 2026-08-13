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
  const [showAdminTools, setShowAdminTools] = useState(false);

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
          updateSelectedFamily(items[0]?.id ?? '');
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
        onSignIn={async (account, password) => {
          await familyService.signInWithAccount(account, password);
        }}
        onRegister={async (account, password) => {
          await familyService.registerWithAccount(account, password);
          setMessage('账号注册成功');
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
        <button className="secondary-button" type="button" onClick={() => setShowAdminTools((value) => !value)}>
          管理员
        </button>
        <button className="secondary-button" type="button" onClick={() => familyService.signOut()}>
          退出
        </button>
      </div>
      {showAdminTools ? (
        <div className="admin-tools-wrapper">
          <AdminResetPasswordPanel
            onResetPassword={(account, password) => familyService.resetUserPasswordAsAdmin(account, password)}
          />
        </div>
      ) : null}
      <App key={selectedFamily.id} store={store} />
    </>
  );
}

export function AuthPanel({
  message,
  onSignIn,
  onRegister,
}: {
  message: string;
  onSignIn: (account: string, password: string) => Promise<void>;
  onRegister: (account: string, password: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<'signIn' | 'register'>('signIn');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setError('');
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致');
          return;
        }
        await onRegister(account, password);
      } else {
        await onSignIn(account, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请稍后重试');
    }
  }

  function switchMode(nextMode: 'signIn' | 'register') {
    setMode(nextMode);
    setConfirmPassword('');
    setError('');
  }

  return (
    <CloudPanel title="登录后同步家庭记录">
      <div className="auth-mode-tabs" role="group" aria-label="账号操作">
        <button
          className={mode === 'signIn' ? 'tab-button active' : 'tab-button'}
          type="button"
          onClick={() => switchMode('signIn')}
        >
          已有账号登录
        </button>
        <button
          className={mode === 'register' ? 'tab-button active' : 'tab-button'}
          type="button"
          onClick={() => switchMode('register')}
        >
          注册账号
        </button>
      </div>

      <form className="cloud-form" onSubmit={submit}>
        <label>
          <span>账号</span>
          <input
            autoComplete="username"
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            placeholder="3-32 位字母、数字或下划线"
            required
          />
        </label>

        <label>
          <span>密码</span>
          <input
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </label>

        {mode === 'register' ? (
          <label>
            <span>确认密码</span>
            <input
              autoComplete="new-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>
        ) : null}

        <button className="primary-button" type="submit">
          {mode === 'register' ? '注册并登录' : '登录'}
        </button>

        {message ? <p className="status-message">{message}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </form>
    </CloudPanel>
  );
}

export function AdminResetPasswordPanel({
  onResetPassword,
}: {
  onResetPassword: (account: string, password: string) => Promise<void>;
}) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage('');
      setError('两次输入的新密码不一致');
      return;
    }

    try {
      setError('');
      await onResetPassword(account, password);
      setMessage('密码已重置');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage('');
      setError(err instanceof Error ? err.message : '密码重置失败');
    }
  }

  return (
    <section className="backup-panel admin-reset-panel" aria-labelledby="admin-reset-title">
      <div>
        <p className="eyebrow">管理员工具</p>
        <h2 id="admin-reset-title">重置用户密码</h2>
      </div>
      <form className="cloud-form" onSubmit={submit}>
        <label>
          <span>重置账号</span>
          <input value={account} onChange={(event) => setAccount(event.target.value)} required />
        </label>
        <label>
          <span>新密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>
        <label>
          <span>确认新密码</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>
        <button className="primary-button" type="submit">
          重置密码
        </button>
      </form>
      {message ? <p className="status-message">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </section>
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
