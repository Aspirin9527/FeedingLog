import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminResetPasswordPanel, AuthPanel } from './CloudApp';

describe('AuthPanel', () => {
  it('signs in with account and password', async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn().mockResolvedValue(undefined);
    const onRegister = vi.fn().mockResolvedValue(undefined);

    render(<AuthPanel message="" onSignIn={onSignIn} onRegister={onRegister} />);

    await user.type(screen.getByLabelText('账号'), 'baby_home');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => expect(onSignIn).toHaveBeenCalledWith('baby_home', 'password123'));
    expect(onRegister).not.toHaveBeenCalled();
  });

  it('registers a new account and password', async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn().mockResolvedValue(undefined);
    const onRegister = vi.fn().mockResolvedValue(undefined);

    render(<AuthPanel message="" onSignIn={onSignIn} onRegister={onRegister} />);

    await user.click(screen.getByRole('button', { name: '注册账号' }));
    await user.type(screen.getByLabelText('账号'), 'baby_home');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.type(screen.getByLabelText('确认密码'), 'password123');
    await user.click(screen.getByRole('button', { name: '注册并登录' }));

    await waitFor(() => expect(onRegister).toHaveBeenCalledWith('baby_home', 'password123'));
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it('prevents registration when password confirmation does not match', async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn().mockResolvedValue(undefined);
    const onRegister = vi.fn().mockResolvedValue(undefined);

    render(<AuthPanel message="" onSignIn={onSignIn} onRegister={onRegister} />);

    await user.click(screen.getByRole('button', { name: '注册账号' }));
    await user.type(screen.getByLabelText('账号'), 'baby_home');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.type(screen.getByLabelText('确认密码'), 'password456');
    await user.click(screen.getByRole('button', { name: '注册并登录' }));

    expect(await screen.findByText('两次输入的密码不一致')).toBeInTheDocument();
    expect(onRegister).not.toHaveBeenCalled();
  });

  it('shows a duplicate account error when registration fails', async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn().mockResolvedValue(undefined);
    const onRegister = vi.fn().mockRejectedValue(new Error('账号已存在'));

    render(<AuthPanel message="" onSignIn={onSignIn} onRegister={onRegister} />);

    await user.click(screen.getByRole('button', { name: '注册账号' }));
    await user.type(screen.getByLabelText('账号'), 'baby_home');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.type(screen.getByLabelText('确认密码'), 'password123');
    await user.click(screen.getByRole('button', { name: '注册并登录' }));

    expect(await screen.findByText('账号已存在')).toBeInTheDocument();
  });
});

describe('AdminResetPasswordPanel', () => {
  it('resets a user password when confirmation matches', async () => {
    const user = userEvent.setup();
    const onResetPassword = vi.fn().mockResolvedValue(undefined);

    render(<AdminResetPasswordPanel onResetPassword={onResetPassword} />);

    await user.type(screen.getByLabelText('重置账号'), 'baby_home');
    await user.type(screen.getByLabelText('新密码'), 'newpass123');
    await user.type(screen.getByLabelText('确认新密码'), 'newpass123');
    await user.click(screen.getByRole('button', { name: '重置密码' }));

    await waitFor(() => expect(onResetPassword).toHaveBeenCalledWith('baby_home', 'newpass123'));
    expect(await screen.findByText('密码已重置')).toBeInTheDocument();
  });

  it('prevents password reset when confirmation does not match', async () => {
    const user = userEvent.setup();
    const onResetPassword = vi.fn().mockResolvedValue(undefined);

    render(<AdminResetPasswordPanel onResetPassword={onResetPassword} />);

    await user.type(screen.getByLabelText('重置账号'), 'baby_home');
    await user.type(screen.getByLabelText('新密码'), 'newpass123');
    await user.type(screen.getByLabelText('确认新密码'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: '重置密码' }));

    expect(await screen.findByText('两次输入的新密码不一致')).toBeInTheDocument();
    expect(onResetPassword).not.toHaveBeenCalled();
  });
});
