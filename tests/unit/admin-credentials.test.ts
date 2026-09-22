import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, createAdminSessionMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  createAdminSessionMock: vi.fn(),
}));

vi.mock('../../packages/core/src/server/db', () => ({ query: queryMock }));
vi.mock('../../packages/core/src/modules/auth/admin-session', () => ({ createAdminSession: createAdminSessionMock }));

import { authenticateAdmin } from '../../packages/core/src/modules/auth/admin-credentials';
import { hashPassword, serializePasswordHash } from '../../packages/core/src/server/crypto';

describe('admin username/password authentication', () => {
  beforeEach(() => {
    queryMock.mockReset();
    createAdminSessionMock.mockReset();
    createAdminSessionMock.mockResolvedValue({ token: 'admin-session-token', expiresAt: new Date('2030-01-01T00:00:00.000Z') });
  });

  it('rejects unknown and incorrect credentials with the same error', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await expect(authenticateAdmin('missing', 'wrong password here')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });

    const digest = serializePasswordHash(await hashPassword('correct password here'));
    queryMock.mockResolvedValue({ rows: [{ user_id: 'admin-user', password_digest: digest }] });
    await expect(authenticateAdmin('ops', 'wrong password here')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
    expect(createAdminSessionMock).not.toHaveBeenCalled();
  });

  it('creates a dedicated admin session after a valid credential match', async () => {
    const digest = serializePasswordHash(await hashPassword('correct password here'));
    queryMock.mockResolvedValue({ rows: [{ user_id: 'admin-user', password_digest: digest }] });
    await expect(authenticateAdmin('OPS', 'correct password here')).resolves.toMatchObject({ userId: 'admin-user', sessionToken: 'admin-session-token' });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('admin_credentials'), ['ops']);
    expect(createAdminSessionMock).toHaveBeenCalledWith('admin-user');
  });
});
