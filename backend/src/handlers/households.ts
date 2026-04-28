import { ddb, Tables } from '../db';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { randomBytes } from 'crypto';
import { RequestContext } from '../auth-context';

// 12 bytes of randomness → 16 base64url characters (~96 bits of entropy).
// base64url is URL-safe and avoids ambiguous characters like '+', '/', '='.
function generateInviteCode(): string {
  return randomBytes(12).toString('base64url');
}

async function getHouseholdMembers(householdId: string) {
  const result = await ddb.send(new QueryCommand({
    TableName: Tables.users,
    IndexName: 'householdId-index',
    KeyConditionExpression: 'householdId = :hid',
    ExpressionAttributeValues: { ':hid': householdId },
  }));
  return (result.Items || []).map((u: any) => ({ userId: u.userId, email: u.email, displayName: u.displayName }));
}

export async function createHousehold(ctx: RequestContext, body: { name: string }) {
  if (!body?.name) return { statusCode: 400, error: 'name is required' };

  const householdId = uuid();
  const inviteCode = generateInviteCode();

  await ddb.send(new PutCommand({
    TableName: Tables.households,
    Item: { householdId, name: body.name, inviteCode, createdAt: new Date().toISOString() },
  }));

  // Associate user with household
  await ddb.send(new UpdateCommand({
    TableName: Tables.users,
    Key: { userId: ctx.userId },
    UpdateExpression: 'SET householdId = :hid',
    ExpressionAttributeValues: { ':hid': householdId },
  }));

  return { statusCode: 201, data: { householdId, name: body.name, inviteCode } };
}

export async function getHousehold(householdId: string, ctx: RequestContext) {
  if (ctx.householdId !== householdId) return { statusCode: 403, error: 'Forbidden' };

  const result = await ddb.send(new GetCommand({
    TableName: Tables.households,
    Key: { householdId },
  }));

  if (!result.Item) return { statusCode: 404, error: 'Household not found' };

  const members = await getHouseholdMembers(householdId);
  return { statusCode: 200, data: { ...result.Item, members } };
}

export async function createInvite(householdId: string, ctx: RequestContext) {
  if (ctx.householdId !== householdId) return { statusCode: 403, error: 'Forbidden' };

  const inviteCode = generateInviteCode();
  await ddb.send(new UpdateCommand({
    TableName: Tables.households,
    Key: { householdId },
    UpdateExpression: 'SET inviteCode = :code',
    ExpressionAttributeValues: { ':code': inviteCode },
  }));

  return { statusCode: 200, data: { inviteCode } };
}

export async function joinHousehold(ctx: RequestContext, body: { inviteCode: string }) {
  if (!body?.inviteCode) return { statusCode: 400, error: 'inviteCode is required' };
  if (ctx.householdId) return { statusCode: 400, error: 'Already in a household' };

  const { Items } = await queryByInviteCode(body.inviteCode);
  if (!Items?.length) return { statusCode: 404, error: 'Invalid invite code' };

  const household = Items[0];

  // Associate the joining user with the household
  await ddb.send(new UpdateCommand({
    TableName: Tables.users,
    Key: { userId: ctx.userId },
    UpdateExpression: 'SET householdId = :hid',
    ExpressionAttributeValues: { ':hid': household.householdId },
  }));

  // Invalidate the invite code so it can't be reused. A new one can be
  // generated from the household page if needed.
  await ddb.send(new UpdateCommand({
    TableName: Tables.households,
    Key: { householdId: household.householdId },
    UpdateExpression: 'REMOVE inviteCode',
  }));

  return { statusCode: 200, data: { householdId: household.householdId, name: household.name } };
}

async function queryByInviteCode(inviteCode: string) {
  return ddb.send(new QueryCommand({
    TableName: Tables.households,
    IndexName: 'inviteCode-index',
    KeyConditionExpression: 'inviteCode = :code',
    ExpressionAttributeValues: { ':code': inviteCode },
    Limit: 1,
  }));
}

export async function ensureUser(ctx: RequestContext) {
  const result = await ddb.send(new GetCommand({
    TableName: Tables.users,
    Key: { userId: ctx.userId },
  }));

  if (!result.Item) {
    await ddb.send(new PutCommand({
      TableName: Tables.users,
      Item: {
        userId: ctx.userId,
        email: ctx.email,
        displayName: ctx.email.split('@')[0],
        createdAt: new Date().toISOString(),
      },
    }));
  }
}

export async function removeMember(householdId: string, ctx: RequestContext, body: { userId: string }) {
  if (ctx.householdId !== householdId) return { statusCode: 403, error: 'Forbidden' };
  if (!body?.userId) return { statusCode: 400, error: 'userId is required' };
  if (body.userId === ctx.userId) return { statusCode: 400, error: 'Cannot remove yourself' };

  // Verify target user is in this household
  const userResult = await ddb.send(new GetCommand({ TableName: Tables.users, Key: { userId: body.userId } }));
  if (!userResult.Item || userResult.Item.householdId !== householdId) {
    return { statusCode: 404, error: 'User not found in household' };
  }

  // Refuse to reduce the household below one member. The caller counts, so
  // with self-removal already blocked we expect at least 2 members here —
  // this guard catches data-integrity edge cases (e.g. stale caller context).
  const members = await getHouseholdMembers(householdId);
  if (members.length <= 1) {
    return { statusCode: 400, error: 'Cannot remove the last member of a household' };
  }

  // Remove household association. The conditional ensures we don't race
  // with another concurrent remove that already moved this user out.
  try {
    await ddb.send(new UpdateCommand({
      TableName: Tables.users,
      Key: { userId: body.userId },
      UpdateExpression: 'REMOVE householdId',
      ConditionExpression: 'householdId = :hid',
      ExpressionAttributeValues: { ':hid': householdId },
    }));
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') {
      return { statusCode: 409, error: 'User is no longer a member of this household' };
    }
    throw err;
  }

  return { statusCode: 200, data: { removed: true } };
}
