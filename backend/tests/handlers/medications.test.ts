jest.mock('../../src/db', () => ({
  ddb: { send: jest.fn() },
  Tables: { households: 'h', users: 'u', dogs: 'd', events: 'e', medications: 'm' },
}));
jest.mock('../../src/auth-context', () => ({
  ...jest.requireActual('../../src/auth-context'),
  verifyDogAccess: jest.fn(),
}));

import { createMedication, listMedications, updateMedication, stopMedication } from '../../src/handlers/medications';
import { RequestContext, verifyDogAccess } from '../../src/auth-context';
const { ddb } = require('../../src/db');
const mockVerify = verifyDogAccess as jest.Mock;
const ctx: RequestContext = { userId: 'u1', email: 't@t.com', householdId: 'hh-1' };

describe('medications handler', () => {
  beforeEach(() => { jest.clearAllMocks(); mockVerify.mockResolvedValue(true); });

  describe('createMedication', () => {
    it('creates a medication', async () => {
      ddb.send.mockResolvedValue({});
      const r = await createMedication('d1', ctx, { name: 'Gabapentin', dosage: '100mg', frequency: 'twice daily' });
      expect(r.statusCode).toBe(201);
      expect(r.data!.name).toBe('Gabapentin');
      expect(r.data!.status).toBe('ACTIVE');
      expect(r.data!.startedAt).toBeDefined();
    });
    it('rejects missing name', async () => {
      const r = await createMedication('d1', ctx, { dosage: '10mg', frequency: 'daily' });
      expect(r.statusCode).toBe(400);
    });
    it('rejects missing dosage', async () => {
      const r = await createMedication('d1', ctx, { name: 'X', frequency: 'daily' });
      expect(r.statusCode).toBe(400);
    });
    it('rejects missing frequency', async () => {
      const r = await createMedication('d1', ctx, { name: 'X', dosage: '10mg' });
      expect(r.statusCode).toBe(400);
    });
    it('returns 403 for wrong household', async () => {
      mockVerify.mockResolvedValue(false);
      const r = await createMedication('d1', ctx, { name: 'X', dosage: '10mg', frequency: 'daily' });
      expect(r.statusCode).toBe(403);
    });
  });

  describe('listMedications', () => {
    it('returns all medications', async () => {
      ddb.send.mockResolvedValueOnce({ Items: [{ status: 'ACTIVE' }, { status: 'STOPPED' }] });
      const r = await listMedications('d1', ctx, {});
      expect(r.statusCode).toBe(200);
      expect(r.data).toHaveLength(2);
    });
    it('filters by ACTIVE status', async () => {
      ddb.send.mockResolvedValueOnce({ Items: [{ status: 'ACTIVE' }, { status: 'STOPPED' }] });
      const r = await listMedications('d1', ctx, { status: 'ACTIVE' });
      expect(r.data).toHaveLength(1);
    });
    it('filters by STOPPED status', async () => {
      ddb.send.mockResolvedValueOnce({ Items: [{ status: 'ACTIVE' }, { status: 'STOPPED' }] });
      const r = await listMedications('d1', ctx, { status: 'STOPPED' });
      expect(r.data).toHaveLength(1);
    });
    it('returns all with status=ALL', async () => {
      ddb.send.mockResolvedValueOnce({ Items: [{ status: 'ACTIVE' }, { status: 'STOPPED' }] });
      const r = await listMedications('d1', ctx, { status: 'ALL' });
      expect(r.data).toHaveLength(2);
    });
  });

  describe('updateMedication', () => {
    it('updates medication fields', async () => {
      ddb.send.mockResolvedValueOnce({ Item: { dogId: 'd1', medicationId: 'm1', name: 'X' } }).mockResolvedValueOnce({});
      const r = await updateMedication('d1', 'm1', ctx, { dosage: '200mg' });
      expect(r.statusCode).toBe(200);
      expect(r.data!.dosage).toBe('200mg');
    });
    it('returns 404 for missing medication', async () => {
      ddb.send.mockResolvedValueOnce({ Item: undefined });
      const r = await updateMedication('d1', 'm1', ctx, { dosage: '200mg' });
      expect(r.statusCode).toBe(404);
    });
    it('rejects empty update', async () => {
      ddb.send.mockResolvedValueOnce({ Item: { dogId: 'd1', medicationId: 'm1' } });
      const r = await updateMedication('d1', 'm1', ctx, {});
      expect(r.statusCode).toBe(400);
    });
  });

  describe('stopMedication', () => {
    it('stops an active medication', async () => {
      ddb.send.mockResolvedValueOnce({ Item: { dogId: 'd1', medicationId: 'm1', status: 'ACTIVE' } }).mockResolvedValueOnce({});
      const r = await stopMedication('d1', 'm1', ctx);
      expect(r.statusCode).toBe(200);
      expect(r.data!.status).toBe('STOPPED');
      expect(r.data!.stoppedAt).toBeDefined();
    });
    it('rejects stopping already stopped medication', async () => {
      ddb.send.mockResolvedValueOnce({ Item: { dogId: 'd1', medicationId: 'm1', status: 'STOPPED' } });
      const r = await stopMedication('d1', 'm1', ctx);
      expect(r.statusCode).toBe(400);
    });
    it('returns 404 for missing medication', async () => {
      ddb.send.mockResolvedValueOnce({ Item: undefined });
      const r = await stopMedication('d1', 'm1', ctx);
      expect(r.statusCode).toBe(404);
    });
  });
});
