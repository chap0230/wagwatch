jest.mock('../../src/db', () => ({
  ddb: { send: jest.fn() },
  Tables: {
    households: 'households',
    users: 'users',
    dogs: 'dogs',
    events: 'events',
    medications: 'medications',
  },
}));

import { createHousehold, getHousehold, joinHousehold } from '../../src/handlers/households';
import { RequestContext } from '../../src/auth-context';

const { ddb } = require('../../src/db');

const ctx: RequestContext = { userId: 'user-1', email: 'test@example.com' };
const ctxWithHousehold: RequestContext = { ...ctx, householdId: 'hh-1' };

describe('households handler', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createHousehold', () => {
    it('creates household and associates user', async () => {
      ddb.send.mockResolvedValue({});
      const result = await createHousehold(ctx, { name: 'Smith Family' });
      expect(result.statusCode).toBe(201);
      expect(result.data!.name).toBe('Smith Family');
      expect(result.data!.householdId).toBeDefined();
      expect(result.data!.inviteCode).toMatch(/^[A-Za-z0-9_-]{16}$/);
      expect(ddb.send).toHaveBeenCalledTimes(2); // put household + update user
    });

    it('rejects missing name', async () => {
      const result = await createHousehold(ctx, {} as any);
      expect(result.statusCode).toBe(400);
    });
  });

  describe('getHousehold', () => {
    it('returns household for authorized user', async () => {
      ddb.send.mockResolvedValueOnce({ Item: { householdId: 'hh-1', name: 'Test' } });
      const result = await getHousehold('hh-1', ctxWithHousehold);
      expect(result.statusCode).toBe(200);
      expect((result.data as any).name).toBe('Test');
    });

    it('returns 403 for wrong household', async () => {
      const result = await getHousehold('hh-other', ctxWithHousehold);
      expect(result.statusCode).toBe(403);
    });
  });

  describe('joinHousehold', () => {
    it('rejects if already in a household', async () => {
      const result = await joinHousehold(ctxWithHousehold, { inviteCode: 'ABC' });
      expect(result.statusCode).toBe(400);
    });

    it('rejects missing invite code', async () => {
      const result = await joinHousehold(ctx, {} as any);
      expect(result.statusCode).toBe(400);
    });
  });
});
