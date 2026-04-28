import { ddb, Tables } from '../db';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import { RequestContext } from '../auth-context';
import {
  LIMITS,
  validateString,
  validateOptionalString,
  validateOptionalEmail,
  validateOptionalPhone,
  validateOptionalWeight,
  validateOptionalStringList,
  validateIsoDate,
  firstError,
} from '../validation';

const s3 = new S3Client({});
const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET!;

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png']);

function validateDogBody(body: any): string | null {
  return firstError([
    validateString(body?.name, 'name', LIMITS.shortText),
    validateString(body?.breed, 'breed', LIMITS.shortText),
    validateIsoDate(body?.dateOfBirth, 'dateOfBirth'),
    validateOptionalWeight(body?.weight, 'weight'),
    validateOptionalString(body?.vetName, 'vetName', LIMITS.shortText),
    validateOptionalPhone(body?.vetPhone, 'vetPhone'),
    validateOptionalEmail(body?.vetEmail, 'vetEmail'),
    validateOptionalStringList(body?.conditions, 'conditions'),
    validateOptionalStringList(body?.allergies, 'allergies'),
  ]);
}

export async function createDog(ctx: RequestContext, body: any) {
  if (!ctx.householdId) return { statusCode: 400, error: 'Must belong to a household first' };
  const err = validateDogBody(body);
  if (err) return { statusCode: 400, error: err };

  const dogId = uuid();
  const item = {
    dogId,
    householdId: ctx.householdId,
    name: body.name,
    breed: body.breed,
    dateOfBirth: body.dateOfBirth,
    weight: body.weight ?? null,
    photoKey: null,
    vetName: body.vetName ?? null,
    vetPhone: body.vetPhone ?? null,
    vetEmail: body.vetEmail ?? null,
    conditions: body.conditions ?? [],
    allergies: body.allergies ?? [],
    createdAt: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: Tables.dogs, Item: item }));
  return { statusCode: 201, data: item };
}

export async function listDogs(ctx: RequestContext) {
  if (!ctx.householdId) return { statusCode: 200, data: [] };

  const result = await ddb.send(new QueryCommand({
    TableName: Tables.dogs,
    IndexName: 'householdId-index',
    KeyConditionExpression: 'householdId = :hid',
    ExpressionAttributeValues: { ':hid': ctx.householdId },
  }));

  return { statusCode: 200, data: result.Items ?? [] };
}

export async function getDog(dogId: string, ctx: RequestContext) {
  const result = await ddb.send(new GetCommand({ TableName: Tables.dogs, Key: { dogId } }));
  if (!result.Item) return { statusCode: 404, error: 'Dog not found' };
  if (result.Item.householdId !== ctx.householdId) return { statusCode: 403, error: 'Forbidden' };

  // Generate photo URL if photo exists
  if (result.Item.photoKey) {
    result.Item.photoUrl = await getSignedUrl(s3,
      new GetObjectCommand({ Bucket: PHOTOS_BUCKET, Key: result.Item.photoKey }),
      { expiresIn: 3600 },
    );
  }

  return { statusCode: 200, data: result.Item };
}

export async function updateDog(dogId: string, ctx: RequestContext, body: any) {
  const existing = await ddb.send(new GetCommand({ TableName: Tables.dogs, Key: { dogId } }));
  if (!existing.Item) return { statusCode: 404, error: 'Dog not found' };
  if (existing.Item.householdId !== ctx.householdId) return { statusCode: 403, error: 'Forbidden' };

  // Validate only fields that are actually present in the update.
  const checks: (string | null)[] = [];
  if (body.name !== undefined) checks.push(validateString(body.name, 'name', LIMITS.shortText));
  if (body.breed !== undefined) checks.push(validateString(body.breed, 'breed', LIMITS.shortText));
  if (body.dateOfBirth !== undefined) checks.push(validateIsoDate(body.dateOfBirth, 'dateOfBirth'));
  if (body.weight !== undefined) checks.push(validateOptionalWeight(body.weight, 'weight'));
  if (body.vetName !== undefined) checks.push(validateOptionalString(body.vetName, 'vetName', LIMITS.shortText));
  if (body.vetPhone !== undefined) checks.push(validateOptionalPhone(body.vetPhone, 'vetPhone'));
  if (body.vetEmail !== undefined) checks.push(validateOptionalEmail(body.vetEmail, 'vetEmail'));
  if (body.conditions !== undefined) checks.push(validateOptionalStringList(body.conditions, 'conditions'));
  if (body.allergies !== undefined) checks.push(validateOptionalStringList(body.allergies, 'allergies'));
  if (body.photoKey !== undefined) checks.push(validateOptionalString(body.photoKey, 'photoKey', LIMITS.mediumText));
  const err = firstError(checks);
  if (err) return { statusCode: 400, error: err };

  const updatable = ['name', 'breed', 'dateOfBirth', 'weight', 'vetName', 'vetPhone', 'vetEmail', 'conditions', 'allergies', 'photoKey'];
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
    TableName: Tables.dogs,
    Key: { dogId },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeValues: values,
  }));

  return { statusCode: 200, data: { ...existing.Item, ...body } };
}

export async function getPhotoUploadUrl(dogId: string, ctx: RequestContext, body: any) {
  const existing = await ddb.send(new GetCommand({ TableName: Tables.dogs, Key: { dogId } }));
  if (!existing.Item) return { statusCode: 404, error: 'Dog not found' };
  if (existing.Item.householdId !== ctx.householdId) return { statusCode: 403, error: 'Forbidden' };

  const contentType = body?.contentType || 'image/jpeg';
  if (!ALLOWED_PHOTO_TYPES.has(contentType)) {
    return { statusCode: 400, error: 'contentType must be image/jpeg or image/png' };
  }
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const key = `${ctx.householdId}/${dogId}/${uuid()}.${ext}`;

  const uploadUrl = await getSignedUrl(s3,
    new PutObjectCommand({ Bucket: PHOTOS_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );

  return { statusCode: 200, data: { uploadUrl, key } };
}
