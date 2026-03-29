import { ddb, Tables } from '../db';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import { RequestContext } from '../auth-context';

const s3 = new S3Client({});
const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET!;

const REQUIRED_FIELDS = ['name', 'breed', 'dateOfBirth'] as const;

export async function createDog(ctx: RequestContext, body: any) {
  if (!ctx.householdId) return { statusCode: 400, error: 'Must belong to a household first' };
  for (const f of REQUIRED_FIELDS) {
    if (!body?.[f]) return { statusCode: 400, error: `${f} is required` };
  }

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
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const key = `${ctx.householdId}/${dogId}/${uuid()}.${ext}`;

  const uploadUrl = await getSignedUrl(s3,
    new PutObjectCommand({ Bucket: PHOTOS_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );

  return { statusCode: 200, data: { uploadUrl, key } };
}
