import { ddb, Tables } from '../db';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { RequestContext, verifyDogAccess } from '../auth-context';

export async function createMedication(dogId: string, ctx: RequestContext, body: any) {
  if (!ctx.householdId) return { statusCode: 400, error: 'Must belong to a household' };
  if (!await verifyDogAccess(dogId, ctx.householdId)) return { statusCode: 403, error: 'Forbidden' };
  if (!body?.name) return { statusCode: 400, error: 'name is required' };
  if (!body?.dosage) return { statusCode: 400, error: 'dosage is required' };
  if (!body?.frequency) return { statusCode: 400, error: 'frequency is required' };

  const item = {
    dogId,
    medicationId: uuid(),
    name: body.name,
    dosage: body.dosage,
    frequency: body.frequency,
    status: 'ACTIVE',
    startedAt: new Date().toISOString(),
    stoppedAt: null,
    notes: body.notes ?? null,
    enteredBy: ctx.userId,
  };

  await ddb.send(new PutCommand({ TableName: Tables.medications, Item: item }));
  return { statusCode: 201, data: item };
}

export async function listMedications(dogId: string, ctx: RequestContext, query: Record<string, string | undefined>) {
  if (!ctx.householdId) return { statusCode: 400, error: 'Must belong to a household' };
  if (!await verifyDogAccess(dogId, ctx.householdId)) return { statusCode: 403, error: 'Forbidden' };

  const result = await ddb.send(new QueryCommand({
    TableName: Tables.medications,
    KeyConditionExpression: 'dogId = :did',
    ExpressionAttributeValues: { ':did': dogId },
  }));

  let items = result.Items ?? [];
  const status = query.status?.toUpperCase();
  if (status && status !== 'ALL') {
    items = items.filter((i: any) => i.status === status);
  }

  return { statusCode: 200, data: items };
}

export async function updateMedication(dogId: string, medicationId: string, ctx: RequestContext, body: any) {
  if (!ctx.householdId) return { statusCode: 400, error: 'Must belong to a household' };
  const existing = await ddb.send(new GetCommand({ TableName: Tables.medications, Key: { dogId, medicationId } }));
  if (!existing.Item) return { statusCode: 404, error: 'Medication not found' };
  if (!await verifyDogAccess(dogId, ctx.householdId)) return { statusCode: 403, error: 'Forbidden' };

  const updatable = ['name', 'dosage', 'frequency', 'notes'];
  const updates: string[] = [];
  const values: Record<string, any> = {};

  for (const key of updatable) {
    if (body[key] !== undefined) {
      updates.push(`${key} = :${key}`);
      values[`:${key}`] = body[key];
    }
  }

  if (!updates.length) return { statusCode: 400, error: 'No fields to update' };

  await ddb.send(new UpdateCommand({
    TableName: Tables.medications,
    Key: { dogId, medicationId },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeValues: values,
  }));

  return { statusCode: 200, data: { ...existing.Item, ...body } };
}

export async function stopMedication(dogId: string, medicationId: string, ctx: RequestContext) {
  if (!ctx.householdId) return { statusCode: 400, error: 'Must belong to a household' };
  const existing = await ddb.send(new GetCommand({ TableName: Tables.medications, Key: { dogId, medicationId } }));
  if (!existing.Item) return { statusCode: 404, error: 'Medication not found' };
  if (!await verifyDogAccess(dogId, ctx.householdId)) return { statusCode: 403, error: 'Forbidden' };
  if (existing.Item.status === 'STOPPED') return { statusCode: 400, error: 'Medication already stopped' };

  const stoppedAt = new Date().toISOString();
  await ddb.send(new UpdateCommand({
    TableName: Tables.medications,
    Key: { dogId, medicationId },
    UpdateExpression: 'SET #s = :status, stoppedAt = :stopped',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':status': 'STOPPED', ':stopped': stoppedAt },
  }));

  return { statusCode: 200, data: { ...existing.Item, status: 'STOPPED', stoppedAt } };
}
