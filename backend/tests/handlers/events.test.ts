jest.mock('../../src/db', () => ({
  ddb: { send: jest.fn() },
  Tables: { households: 'households', users: 'users', dogs: 'dogs', events: 'events', medications: 'medications' },
}));

jest.mock('../../src/auth-context', () => ({
  ...jest.requireActual('../../src/auth-context'),
  verifyDogAccess: jest.fn(),
}));

import { createEvent, listEvents, getEvent, updateEvent, deleteEvent, getDailySummary } from '../../src/handlers/events';
import { RequestContext, verifyDogAccess } from '../../src/auth-context';

const { ddb } = require('../../src/db');
const mockVerify = verifyDogAccess as jest.Mock;

const ctx: RequestContext = { userId: 'user-1', email: 'test@example.com', householdId: 'hh-1' };

type Result = { statusCode: number; data?: any; error?: string };

describe('events handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerify.mockResolvedValue(true);
  });

  describe('createEvent', () => {
    it('creates an ACCIDENT event', async () => {
      ddb.send.mockResolvedValue({});
      const result: Result = await createEvent('dog-1', ctx, {
        eventType: 'ACCIDENT',
        data: { type: 'pee', location: 'living room' },
        notes: 'near the couch',
      });
      expect(result.statusCode).toBe(201);
      expect(result.data!.eventType).toBe('ACCIDENT');
      expect(result.data!.enteredBy).toBe('user-1');
    });

    it('creates a MEDICAL event with severity', async () => {
      ddb.send.mockResolvedValue({});
      const result: Result = await createEvent('dog-1', ctx, {
        eventType: 'MEDICAL',
        data: { medicalType: 'vomiting', severity: 'moderate' },
      });
      expect(result.statusCode).toBe(201);
    });

    it('creates a BEHAVIOR event', async () => {
      ddb.send.mockResolvedValue({});
      const result: Result = await createEvent('dog-1', ctx, {
        eventType: 'BEHAVIOR',
        data: { behaviorType: 'excessive licking' },
      });
      expect(result.statusCode).toBe(201);
    });

    it('creates a NIGHT_NOTE event', async () => {
      ddb.send.mockResolvedValue({});
      const result: Result = await createEvent('dog-1', ctx, {
        eventType: 'NIGHT_NOTE',
        data: { description: 'restless, got up 3 times' },
      });
      expect(result.statusCode).toBe(201);
    });

    it('rejects invalid eventType', async () => {
      const result: Result = await createEvent('dog-1', ctx, { eventType: 'INVALID', data: {} });
      expect(result.statusCode).toBe(400);
    });

    it('rejects ACCIDENT without type', async () => {
      const result: Result = await createEvent('dog-1', ctx, {
        eventType: 'ACCIDENT',
        data: { location: 'kitchen' },
      });
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('type');
    });

    it('rejects invalid severity', async () => {
      const result: Result = await createEvent('dog-1', ctx, {
        eventType: 'MEDICAL',
        data: { medicalType: 'vomiting', severity: 'extreme' },
      });
      expect(result.statusCode).toBe(400);
    });

    it('returns 403 for wrong household', async () => {
      mockVerify.mockResolvedValue(false);
      const result: Result = await createEvent('dog-1', ctx, {
        eventType: 'ACCIDENT',
        data: { type: 'pee', location: 'hall' },
      });
      expect(result.statusCode).toBe(403);
    });
  });

  describe('DAY_RATING upsert', () => {
    it('creates a new day rating', async () => {
      ddb.send
        .mockResolvedValueOnce({ Items: [] }) // query for existing
        .mockResolvedValueOnce({}); // put
      const result: Result = await createEvent('dog-1', ctx, {
        eventType: 'DAY_RATING',
        data: { rating: 4 },
        occurredAt: '2026-03-26T12:00:00Z',
      });
      expect(result.statusCode).toBe(201);
      expect(result.data!.data.rating).toBe(4);
    });

    it('updates existing day rating', async () => {
      ddb.send
        .mockResolvedValueOnce({ Items: [{ dogId: 'dog-1', eventId: 'existing-id', data: { rating: 3 } }] })
        .mockResolvedValueOnce({}); // update
      const result: Result = await createEvent('dog-1', ctx, {
        eventType: 'DAY_RATING',
        data: { rating: 5 },
        occurredAt: '2026-03-26T12:00:00Z',
      });
      expect(result.statusCode).toBe(200);
      expect(result.data!.data.rating).toBe(5);
    });

    it('rejects invalid rating', async () => {
      const result: Result = await createEvent('dog-1', ctx, {
        eventType: 'DAY_RATING',
        data: { rating: 6 },
      });
      expect(result.statusCode).toBe(400);
    });
  });

  describe('listEvents', () => {
    it('lists events with date range', async () => {
      ddb.send.mockResolvedValueOnce({ Items: [{ eventId: 'e1' }, { eventId: 'e2' }] });
      const result: Result = await listEvents('dog-1', ctx, { startDate: '2026-03-01', endDate: '2026-03-31' });
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(2);
    });

    it('lists events filtered by type', async () => {
      ddb.send.mockResolvedValueOnce({ Items: [{ eventId: 'e1', eventType: 'ACCIDENT' }] });
      const result: Result = await listEvents('dog-1', ctx, { startDate: '2026-03-01', endDate: '2026-03-31', eventType: 'ACCIDENT' });
      expect(result.statusCode).toBe(200);
    });

    it('lists recent events without date range', async () => {
      ddb.send.mockResolvedValueOnce({ Items: [] });
      const result: Result = await listEvents('dog-1', ctx, {});
      expect(result.statusCode).toBe(200);
    });
  });

  describe('getEvent', () => {
    it('returns event', async () => {
      ddb.send.mockResolvedValueOnce({ Item: { dogId: 'dog-1', eventId: 'e1', householdId: 'hh-1' } });
      const result: Result = await getEvent('dog-1', 'e1', ctx);
      expect(result.statusCode).toBe(200);
    });

    it('returns 404 for missing event', async () => {
      ddb.send.mockResolvedValueOnce({ Item: undefined });
      const result: Result = await getEvent('dog-1', 'e1', ctx);
      expect(result.statusCode).toBe(404);
    });
  });

  describe('updateEvent', () => {
    it('updates event data', async () => {
      ddb.send
        .mockResolvedValueOnce({ Item: { dogId: 'dog-1', eventId: 'e1', householdId: 'hh-1', eventType: 'ACCIDENT' } })
        .mockResolvedValueOnce({});
      const result: Result = await updateEvent('dog-1', 'e1', ctx, { data: { type: 'poop', location: 'bedroom' } });
      expect(result.statusCode).toBe(200);
    });

    it('rejects empty update', async () => {
      ddb.send.mockResolvedValueOnce({ Item: { dogId: 'dog-1', eventId: 'e1', householdId: 'hh-1', eventType: 'ACCIDENT' } });
      const result: Result = await updateEvent('dog-1', 'e1', ctx, {});
      expect(result.statusCode).toBe(400);
    });
  });

  describe('deleteEvent', () => {
    it('deletes event', async () => {
      ddb.send
        .mockResolvedValueOnce({ Item: { dogId: 'dog-1', eventId: 'e1', householdId: 'hh-1' } })
        .mockResolvedValueOnce({});
      const result: Result = await deleteEvent('dog-1', 'e1', ctx);
      expect(result.statusCode).toBe(200);
      expect(result.data!.deleted).toBe(true);
    });
  });

  describe('getDailySummary', () => {
    it('returns events and day rating for a date', async () => {
      ddb.send.mockResolvedValueOnce({
        Items: [
          { eventType: 'ACCIDENT', data: { type: 'pee' } },
          { eventType: 'DAY_RATING', data: { rating: 3 } },
        ],
      });
      const result: Result = await getDailySummary('dog-1', '2026-03-26', ctx);
      expect(result.statusCode).toBe(200);
      expect(result.data!.events).toHaveLength(2);
      expect(result.data!.dayRating).toBe(3);
    });

    it('returns null rating when no rating exists', async () => {
      ddb.send.mockResolvedValueOnce({ Items: [{ eventType: 'ACCIDENT' }] });
      const result: Result = await getDailySummary('dog-1', '2026-03-26', ctx);
      expect(result.statusCode).toBe(200);
      expect(result.data!.dayRating).toBeNull();
    });
  });
});
