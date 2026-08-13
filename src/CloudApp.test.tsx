import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthPanel } from './CloudApp';

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
    await user.click(screen.getByRole('button', { name: '注册并登录' }));

    await waitFor(() => expect(onRegister).toHaveBeenCalledWith('baby_home', 'password123'));
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it('shows a duplicate account error when registration fails', async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn().mockResolvedValue(undefined);
    const onRegister = vi.fn().mockRejectedValue(new Error('账号已存在'));

    render(<AuthPanel message="" onSignIn={onSignIn} onRegister={onRegister} />);

    await user.click(screen.getByRole('button', { name: '注册账号' }));
    await user.type(screen.getByLabelText('账号'), 'baby_home');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: '注册并登录' }));

    expect(await screen.findByText('账号已存在')).toBeInTheDocument();
  });
});
