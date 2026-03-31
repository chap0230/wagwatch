import { ddb, Tables } from '../db';
import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { RequestContext, verifyDogAccess } from '../auth-context';

const EVENT_TYPES = ['ACCIDENT', 'MEDICAL', 'BEHAVIOR', 'NIGHT_NOTE', 'DAY_RATING'] as const;
type EventType = typeof EVENT_TYPES[number];

function validateEventData(eventType: EventType, data: any): string | null {
  switch (eventType) {
    case 'ACCIDENT':
      if (!data?.type || !['pee', 'poop'].includes(data.type)) return 'data.type must be "pee" or "poop"';
      if (!data.location) return 'data.location is required';
      return null;
    case 'MEDICAL':
      if (!data?.medicalType) return 'data.medicalType is required';
      if (data.severity && !['mild', 'moderate', 'severe'].includes(data.severity)) return 'data.severity must be mild/moderate/severe';
      return null;
    case 'BEHAVIOR':
      if (!data?.behaviorType) return 'data.behaviorType is required';
      return null;
    case 'NIGHT_NOTE':
      if (!data?.description) return 'data.description is required';
      return null;
    case 'DAY_RATING':
      if (!data?.rating || data.rating < 1 || data.rating > 5) return 'data.rating must be 1-5';
      return null;
    default:
      return 'Invalid eventType';
  }
}

export async function createEvent(dogId: string, ctx: RequestContext, body: any) {
  console.log('createEvent called', { dogId, occurredAt: body.occurredAt, localDate: body.localDate, eventType: body.eventType });
  if (!ctx.householdId) return { statusCode: 400, error: 'Must belong to a household' };
  if (!await verifyDogAccess(dogId, ctx.householdId)) return { statusCode: 403, error: 'Forbidden' };

  const eventType = body?.eventType as EventType;
  if (!eventType || !EVENT_TYPES.includes(eventType)) return { statusCode: 400, error: `eventType must be one of: ${EVENT_TYPES.join(', ')}` };

  const validationError = validateEventData(eventType, body.data);
  if (validationError) return { statusCode: 400, error: validationError };

  const now = new Date().toISOString();
  const occurredAt = body.occurredAt || now;
  // Use explicitly provided localDate if available (sent by frontend in user's timezone),
  // otherwise fall back to slicing the UTC ISO string
  const date = body.localDate || occurredAt.slice(0, 10);

  // DAY_RATING: upsert — one per dog per day
  if (eventType === 'DAY_RATING') {
    return upsertDayRating(dogId, ctx, date, body.data, body.notes, occurredAt);
  }

  const eventId = `${occurredAt}#${uuid()}`;
  const item = {
    dogId,
    eventId,
    householdId: ctx.householdId,
    eventType,
    occurredAt,
    date,
    enteredBy: ctx.userId,
    data: body.data,
    notes: body.notes ?? null,
    createdAt: now,
  };

  await ddb.send(new PutCommand({ TableName: Tables.events, Item: item }));
  return { statusCode: 201, data: item };
}

async function upsertDayRating(dogId: string, ctx: RequestContext, date: string, data: any, notes: string | undefined, occurredAt: string) {
  // Check for existing day rating on this date
  const existing = await ddb.send(new QueryCommand({
    TableName: Tables.events,
    IndexName: 'dogId-date-index',
    KeyConditionExpression: 'dogId = :did AND #d = :date',
    FilterExpression: 'eventType = :type',
    ExpressionAttributeNames: { '#d': 'date' },
    ExpressionAttributeValues: { ':did': dogId, ':date': date, ':type': 'DAY_RATING' },
  }));

  if (existing.Items?.length) {
    const item = existing.Items[0];
    await ddb.send(new UpdateCommand({
      TableName: Tables.events,
      Key: { dogId, eventId: item.eventId },
      UpdateExpression: 'SET #data = :data, notes = :notes, enteredBy = :by',
      ExpressionAttributeNames: { '#data': 'data' },
      ExpressionAttributeValues: { ':data': data, ':notes': notes ?? null, ':by': ctx.userId },
    }));
    return { statusCode: 200, data: { ...item, data, notes, enteredBy: ctx.userId } };
  }

  const eventId = `${occurredAt}#${uuid()}`;
  const item = {
    dogId, eventId, householdId: ctx.householdId!, eventType: 'DAY_RATING' as const,
    occurredAt, date, enteredBy: ctx.userId, data, notes: notes ?? null, createdAt: new Date().toISOString(),
  };
  await ddb.send(new PutCommand({ TableName: Tables.events, Item: item }));
  return { statusCode: 201, data: item };
}

export async function listEvents(dogId: string, ctx: RequestContext, query: Record<string, string | undefined>) {
  if (!ctx.householdId) return { statusCode: 400, error: 'Must belong to a household' };
  if (!await verifyDogAccess(dogId, ctx.householdId)) return { statusCode: 403, error: 'Forbidden' };

  const startDate = query.startDate;
  const endDate = query.endDate;
  const eventType = query.eventType;

  // Use date GSI for date-range queries
  if (startDate || endDate) {
    let keyExpr = 'dogId = :did';
    const values: Record<string, any> = { ':did': dogId };

    if (startDate && endDate) {
      keyExpr += ' AND #d BETWEEN :start AND :end';
      values[':start'] = startDate;
      values[':end'] = endDate;
    } else if (startDate) {
      keyExpr += ' AND #d >= :start';
      values[':start'] = startDate;
    } else {
      keyExpr += ' AND #d <= :end';
      values[':end'] = endDate!;
    }

    let filterExpr: string | undefined;
    if (eventType) {
      filterExpr = 'eventType = :type';
      values[':type'] = eventType;
    }

    const result = await ddb.send(new QueryCommand({
      TableName: Tables.events,
      IndexName: 'dogId-date-index',
      KeyConditionExpression: keyExpr,
      FilterExpression: filterExpr,
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: values,
      ScanIndexForward: false,
    }));
    return { statusCode: 200, data: result.Items ?? [] };
  }

  // Default: query base table (most recent events)
  const values: Record<string, any> = { ':did': dogId };
  let filterExpr: string | undefined;
  if (eventType) {
    filterExpr = 'eventType = :type';
    values[':type'] = eventType;
  }

  const result = await ddb.send(new QueryCommand({
    TableName: Tables.events,
    KeyConditionExpression: 'dogId = :did',
    FilterExpression: filterExpr,
    ExpressionAttributeValues: values,
    ScanIndexForward: false,
    Limit: 50,
  }));
  return { statusCode: 200, data: result.Items ?? [] };
}

export async function getEvent(dogId: string, eventId: string, ctx: RequestContext) {
  if (!ctx.householdId) return { statusCode: 400, error: 'Must belong to a household' };
  const result = await ddb.send(new GetCommand({ TableName: Tables.events, Key: { dogId, eventId } }));
  if (!result.Item) return { statusCode: 404, error: 'Event not found' };
  if (result.Item.householdId !== ctx.householdId) return { statusCode: 403, error: 'Forbidden' };
  return { statusCode: 200, data: result.Item };
}

export async function updateEvent(dogId: string, eventId: string, ctx: RequestContext, body: any) {
  console.log('updateEvent called', { dogId, eventId, bodyKeys: Object.keys(body) });
  if (!ctx.householdId) return { statusCode: 400, error: 'Must belong to a household' };
  const existing = await ddb.send(new GetCommand({ TableName: Tables.events, Key: { dogId, eventId } }));
  console.log('updateEvent GetCommand result', { found: !!existing.Item, eventId });
  if (!existing.Item) return { statusCode: 404, error: 'Event not found' };
  if (existing.Item.householdId !== ctx.householdId) return { statusCode: 403, error: 'Forbidden' };

  if (body.data) {
    const err = validateEventData(existing.Item.eventType, body.data);
    if (err) return { statusCode: 400, error: err };
  }

  const updates: string[] = [];
  const values: Record<string, any> = {};
  const names: Record<string, string> = {};

  if (body.data !== undefined) { updates.push('#data = :data'); values[':data'] = body.data; names['#data'] = 'data'; }
  if (body.notes !== undefined) { updates.push('notes = :notes'); values[':notes'] = body.notes; }
  if (body.occurredAt !== undefined) {
    updates.push('occurredAt = :oat');
    values[':oat'] = body.occurredAt;
    updates.push('#d = :date');
    values[':date'] = body.occurredAt.slice(0, 10);
    names['#d'] = 'date';
  }

  if (!updates.length) return { statusCode: 400, error: 'No fields to update' };

  await ddb.send(new UpdateCommand({
    TableName: Tables.events,
    Key: { dogId, eventId },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeValues: values,
    ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
  }));

  return { statusCode: 200, data: { ...existing.Item, ...body } };
}

export async function deleteEvent(dogId: string, eventId: string, ctx: RequestContext) {
  console.log('deleteEvent called', { dogId, eventId });
  if (!ctx.householdId) return { statusCode: 400, error: 'Must belong to a household' };
  const existing = await ddb.send(new GetCommand({ TableName: Tables.events, Key: { dogId, eventId } }));
  console.log('deleteEvent GetCommand result', { found: !!existing.Item, eventId });
  if (!existing.Item) return { statusCode: 404, error: 'Event not found' };
  if (existing.Item.householdId !== ctx.householdId) return { statusCode: 403, error: 'Forbidden' };

  await ddb.send(new DeleteCommand({ TableName: Tables.events, Key: { dogId, eventId } }));
  return { statusCode: 200, data: { deleted: true } };
}

export async function getDailySummary(dogId: string, date: string, ctx: RequestContext) {
  if (!ctx.householdId) return { statusCode: 400, error: 'Must belong to a household' };
  if (!await verifyDogAccess(dogId, ctx.householdId)) return { statusCode: 403, error: 'Forbidden' };

  const result = await ddb.send(new QueryCommand({
    TableName: Tables.events,
    IndexName: 'dogId-date-index',
    KeyConditionExpression: 'dogId = :did AND #d = :date',
    ExpressionAttributeNames: { '#d': 'date' },
    ExpressionAttributeValues: { ':did': dogId, ':date': date },
  }));

  const events = result.Items ?? [];
  const dayRating = events.find(e => e.eventType === 'DAY_RATING');

  return { statusCode: 200, data: { date, events, dayRating: dayRating?.data?.rating ?? null } };
}
