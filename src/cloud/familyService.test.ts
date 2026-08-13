import { describe, expect, it, vi } from 'vitest';
import { FamilyService } from './familyService';

describe('FamilyService auth', () => {
  it('sends an email verification code', async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const service = new FamilyService({ auth: { signInWithOtp } } as never);

    await service.sendEmailCode('parent@example.com');

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'parent@example.com',
      options: {
        shouldCreateUser: true,
      },
    });
  });

  it('verifies an email code and returns the active session', async () => {
    const session = { user: { id: 'user-1' } };
    const verifyOtp = vi.fn().mockResolvedValue({ data: { session }, error: null });
    const service = new FamilyService({ auth: { verifyOtp } } as never);

    await expect(service.verifyEmailCode('parent@example.com', '123456')).resolves.toBe(session);

    expect(verifyOtp).toHaveBeenCalledWith({
      email: 'parent@example.com',
      token: '123456',
      type: 'email',
    });
  });
});
