import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(client);

export const Tables = {
  households: process.env.HOUSEHOLDS_TABLE!,
  users: process.env.USERS_TABLE!,
  dogs: process.env.DOGS_TABLE!,
  events: process.env.EVENTS_TABLE!,
  medications: process.env.MEDICATIONS_TABLE!,
};
