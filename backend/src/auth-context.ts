import { APIGatewayProxyEvent } from 'aws-lambda';
import { ddb, Tables } from './db';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

export interface RequestContext {
  userId: string;
  email: string;
  householdId?: string;
}

export async function extractContext(event: APIGatewayProxyEvent): Promise<RequestContext> {
  const claims = event.requestContext.authorizer?.claims;
  if (!claims) throw new Error('No auth claims');

  const userId = claims.sub as string;
  const email = claims.email as string;

  // Look up user's household
  const result = await ddb.send(new GetCommand({
    TableName: Tables.users,
    Key: { userId },
  }));

  return {
    userId,
    email,
    householdId: result.Item?.householdId,
  };
}

export async function verifyDogAccess(dogId: string, householdId: string): Promise<boolean> {
  const result = await ddb.send(new GetCommand({
    TableName: Tables.dogs,
    Key: { dogId },
  }));
  return result.Item?.householdId === householdId;
}
