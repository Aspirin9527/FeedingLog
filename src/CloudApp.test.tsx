import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthPanel } from './CloudApp';

describe('AuthPanel', () => {
  it('sends an email code and signs in with the code', async () => {
    const user = userEvent.setup();
    const onSendCode = vi.fn().mockResolvedValue(undefined);
    const onVerifyCode = vi.fn().mockResolvedValue(undefined);

    render(<AuthPanel message="" onSendCode={onSendCode} onVerifyCode={onVerifyCode} />);

    await user.type(screen.getByLabelText('邮箱'), 'parent@example.com');
    await user.click(screen.getByRole('button', { name: '发送验证码' }));

    await waitFor(() => expect(onSendCode).toHaveBeenCalledWith('parent@example.com'));
    expect(await screen.findByLabelText('验证码')).toBeInTheDocument();

    await user.type(screen.getByLabelText('验证码'), '123456');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => expect(onVerifyCode).toHaveBeenCalledWith('parent@example.com', '123456'));
  });
});
