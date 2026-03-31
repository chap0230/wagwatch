import { updateEvent, deleteEvent, getEvent } from '../../src/handlers/events';
import { ddb, Tables } from '../../src/db';

// Mock DynamoDB
jest.mock('../../src/db', () => ({
  ddb: {
    send: jest.fn(),
  },
  Tables: {
    events: 'test-events-table',
  },
}));

// Mock auth-context
jest.mock('../../src/auth-context', () => ({
  verifyDogAccess: jest.fn().mockResolvedValue(true),
}));

const mockDdbSend = ddb.send as jest.MockedFunction<any>;

describe('Events Handler - URL Encoding', () => {
  const dogId = 'test-dog-123';
  const householdId = 'test-household-456';
  const userId = 'test-user-789';
  
  // eventId with special characters that get URL-encoded: : becomes %3A, # becomes %23
  const eventId = '2026-03-30T15:24:11.661Z#cc3860a6-30bc-43a5-8fd3-92e31de59c06';
  
  const mockEvent = {
    dogId,
    eventId,
    householdId,
    eventType: 'ACCIDENT',
    occurredAt: '2026-03-30T15:24:11.661Z',
    date: '2026-03-30',
    enteredBy: userId,
    data: { type: 'pee', location: 'Inside' },
    notes: 'Test note',
    createdAt: '2026-03-30T15:24:11.661Z',
  };

  const ctx: any = { userId, householdId, email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEvent', () => {
    it('should retrieve event with special characters in eventId', async () => {
      mockDdbSend.mockResolvedValueOnce({ Item: mockEvent });

      const result = await getEvent(dogId, eventId, ctx);

      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(mockEvent);
      expect(mockDdbSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Key: { dogId, eventId },
          }),
        })
      );
    });

    it('should return 404 when event not found', async () => {
      mockDdbSend.mockResolvedValueOnce({});

      const result = await getEvent(dogId, eventId, ctx);

      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Event not found');
    });
  });

  describe('updateEvent', () => {
    it('should update event with special characters in eventId', async () => {
      // Mock GetCommand
      mockDdbSend.mockResolvedValueOnce({ Item: mockEvent });
      // Mock UpdateCommand
      mockDdbSend.mockResolvedValueOnce({});

      const updateBody = {
        data: { type: 'poop', location: 'Outside' },
        notes: 'Updated note',
        occurredAt: '2026-03-30T16:00:00.000Z',
      };

      const result = await updateEvent(dogId, eventId, ctx, updateBody);

      expect(result.statusCode).toBe(200);
      expect(mockDdbSend).toHaveBeenCalledTimes(2);
      
      // Verify GetCommand was called with correct eventId
      expect(mockDdbSend).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          input: expect.objectContaining({
            Key: { dogId, eventId },
          }),
        })
      );

      // Verify UpdateCommand was called with correct eventId
      expect(mockDdbSend).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          input: expect.objectContaining({
            Key: { dogId, eventId },
          }),
        })
      );
    });

    it('should return 404 when event not found during update', async () => {
      mockDdbSend.mockResolvedValueOnce({});

      const result = await updateEvent(dogId, eventId, ctx, { data: { type: 'pee', location: 'Inside' } });

      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Event not found');
    });
  });

  describe('deleteEvent', () => {
    it('should delete event with special characters in eventId', async () => {
      // Mock GetCommand
      mockDdbSend.mockResolvedValueOnce({ Item: mockEvent });
      // Mock DeleteCommand
      mockDdbSend.mockResolvedValueOnce({});

      const result = await deleteEvent(dogId, eventId, ctx);

      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual({ deleted: true });
      expect(mockDdbSend).toHaveBeenCalledTimes(2);
      
      // Verify GetCommand was called with correct eventId
      expect(mockDdbSend).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          input: expect.objectContaining({
            Key: { dogId, eventId },
          }),
        })
      );

      // Verify DeleteCommand was called with correct eventId
      expect(mockDdbSend).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          input: expect.objectContaining({
            Key: { dogId, eventId },
          }),
        })
      );
    });

    it('should return 404 when event not found during delete', async () => {
      mockDdbSend.mockResolvedValueOnce({});

      const result = await deleteEvent(dogId, eventId, ctx);

      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Event not found');
    });
  });
});
