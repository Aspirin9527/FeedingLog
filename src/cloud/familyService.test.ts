import { describe, expect, it, vi } from 'vitest';
import { accountToAuthEmail, FamilyService } from './familyService';

describe('FamilyService account auth', () => {
  it('maps custom accounts to internal auth emails', () => {
    expect(accountToAuthEmail('Baby_Home_01')).toBe('baby_home_01@feedinglog.local');
  });

  it('rejects invalid custom accounts before calling auth', async () => {
    const signUp = vi.fn();
    const service = new FamilyService({ auth: { signUp } } as never);

    await expect(service.registerWithAccount('bad-account!', 'password123')).rejects.toThrow(
      '账号只能使用 3-32 位字母、数字或下划线',
    );
    expect(signUp).not.toHaveBeenCalled();
  });

  it('registers with custom account and password', async () => {
    const session = { user: { id: 'user-1' } };
    const signUp = vi.fn().mockResolvedValue({ data: { session }, error: null });
    const service = new FamilyService({ auth: { signUp } } as never);

    await expect(service.registerWithAccount('baby_home', 'password123')).resolves.toBe(session);

    expect(signUp).toHaveBeenCalledWith({
      email: 'baby_home@feedinglog.local',
      password: 'password123',
      options: {
        data: {
          account: 'baby_home',
        },
      },
    });
  });

  it('reports duplicate account registration errors', async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { session: null },
      error: new Error('User already registered'),
    });
    const service = new FamilyService({ auth: { signUp } } as never);

    await expect(service.registerWithAccount('baby_home', 'password123')).rejects.toThrow('账号已存在');
  });

  it('signs in with custom account and password', async () => {
    const session = { user: { id: 'user-1' } };
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { session }, error: null });
    const service = new FamilyService({ auth: { signInWithPassword } } as never);

    await expect(service.signInWithAccount('baby_home', 'password123')).resolves.toBe(session);

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'baby_home@feedinglog.local',
      password: 'password123',
    });
  });

  it('requests an admin password reset through an Edge Function', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
    const service = new FamilyService({ functions: { invoke } } as never);

    await service.resetUserPasswordAsAdmin('Baby_Home', 'newpass123');

    expect(invoke).toHaveBeenCalledWith('admin-reset-password', {
      body: {
        account: 'baby_home',
        password: 'newpass123',
      },
    });
  });

  it('checks whether the current user is an app admin', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { user_id: 'user-1' }, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const service = new FamilyService({ from } as never);

    await expect(service.isCurrentUserAdmin('user-1')).resolves.toBe(true);

    expect(from).toHaveBeenCalledWith('app_admins');
    expect(select).toHaveBeenCalledWith('user_id');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('returns false when the current user is not an app admin', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const service = new FamilyService({ from } as never);

    await expect(service.isCurrentUserAdmin('user-2')).resolves.toBe(false);
  });
});
