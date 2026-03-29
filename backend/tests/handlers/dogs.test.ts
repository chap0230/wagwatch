jest.mock('../../src/db', () => ({
  ddb: { send: jest.fn() },
  Tables: { households: 'households', users: 'users', dogs: 'dogs', events: 'events', medications: 'medications' },
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned-url'),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

import { createDog, listDogs, getDog, updateDog, getPhotoUploadUrl } from '../../src/handlers/dogs';
import { RequestContext } from '../../src/auth-context';

const { ddb } = require('../../src/db');

const ctx: RequestContext = { userId: 'user-1', email: 'test@example.com', householdId: 'hh-1' };
const ctxNoHousehold: RequestContext = { userId: 'user-1', email: 'test@example.com' };

describe('dogs handler', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createDog', () => {
    it('creates a dog with required fields', async () => {
      ddb.send.mockResolvedValue({});
      const result = await createDog(ctx, { name: 'Bella', breed: 'Lab', dateOfBirth: '2009-01-15' });
      expect(result.statusCode).toBe(201);
      expect(result.data!.name).toBe('Bella');
      expect(result.data!.dogId).toBeDefined();
      expect(result.data!.householdId).toBe('hh-1');
    });

    it('rejects if not in a household', async () => {
      const result = await createDog(ctxNoHousehold, { name: 'Bella', breed: 'Lab', dateOfBirth: '2009-01-15' });
      expect(result.statusCode).toBe(400);
    });

    it('rejects missing required fields', async () => {
      const result = await createDog(ctx, { name: 'Bella' });
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('breed');
    });
  });

  describe('listDogs', () => {
    it('returns dogs for household', async () => {
      ddb.send.mockResolvedValueOnce({ Items: [{ dogId: 'd1', name: 'Bella' }] });
      const result = await listDogs(ctx);
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
    });

    it('returns empty array if no household', async () => {
      const result = await listDogs(ctxNoHousehold);
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual([]);
    });
  });

  describe('getDog', () => {
    it('returns dog with photo URL', async () => {
      ddb.send.mockResolvedValueOnce({ Item: { dogId: 'd1', householdId: 'hh-1', photoKey: 'photo.jpg' } });
      const result = await getDog('d1', ctx);
      expect(result.statusCode).toBe(200);
      expect(result.data!.photoUrl).toBe('https://s3.example.com/presigned-url');
    });

    it('returns 403 for wrong household', async () => {
      ddb.send.mockResolvedValueOnce({ Item: { dogId: 'd1', householdId: 'other' } });
      const result = await getDog('d1', ctx);
      expect(result.statusCode).toBe(403);
    });

    it('returns 404 for missing dog', async () => {
      ddb.send.mockResolvedValueOnce({ Item: undefined });
      const result = await getDog('d1', ctx);
      expect(result.statusCode).toBe(404);
    });
  });

  describe('updateDog', () => {
    it('updates allowed fields', async () => {
      ddb.send
        .mockResolvedValueOnce({ Item: { dogId: 'd1', householdId: 'hh-1', name: 'Bella' } })
        .mockResolvedValueOnce({});
      const result = await updateDog('d1', ctx, { weight: 45 });
      expect(result.statusCode).toBe(200);
      expect(result.data!.weight).toBe(45);
    });

    it('rejects empty update', async () => {
      ddb.send.mockResolvedValueOnce({ Item: { dogId: 'd1', householdId: 'hh-1' } });
      const result = await updateDog('d1', ctx, {});
      expect(result.statusCode).toBe(400);
    });
  });

  describe('getPhotoUploadUrl', () => {
    it('returns pre-signed upload URL and key', async () => {
      ddb.send.mockResolvedValueOnce({ Item: { dogId: 'd1', householdId: 'hh-1' } });
      const result = await getPhotoUploadUrl('d1', ctx, { contentType: 'image/jpeg' });
      expect(result.statusCode).toBe(200);
      expect(result.data!.uploadUrl).toBe('https://s3.example.com/presigned-url');
      expect(result.data!.key).toContain('hh-1/d1/');
    });
  });
});
