jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: jest.fn().mockImplementation(() => ({})) }));
jest.mock('@aws-sdk/lib-dynamodb', () => {
  const send = jest.fn();
  return {
    DynamoDBDocumentClient: { from: jest.fn().mockReturnValue({ send }) },
    GetCommand: jest.fn(), PutCommand: jest.fn(), QueryCommand: jest.fn(), ScanCommand: jest.fn(), UpdateCommand: jest.fn(),
  };
});
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  ConverseCommand: jest.fn(),
}));
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

import { handler } from '../src/chat-handler';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Get mocked ddb send
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const ddbSend = DynamoDBDocumentClient.from().send;

const mockEvent = (method: string, resource: string, opts: any = {}): APIGatewayProxyEvent => ({
  httpMethod: method, resource, path: resource,
  body: opts.body ? JSON.stringify(opts.body) : null,
  pathParameters: opts.pathParameters || { dogId: 'dog-1' },
  headers: {}, queryStringParameters: null,
  requestContext: { authorizer: { claims: { sub: 'user-1', email: 'test@test.com' } } },
} as any);

describe('chat-handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when message is missing', async () => {
    ddbSend
      .mockResolvedValueOnce({ Item: { userId: 'user-1', householdId: 'hh-1' } }) // user lookup
      .mockResolvedValueOnce({ Item: { dogId: 'dog-1', householdId: 'hh-1' } }); // dog lookup

    const result = await handler(mockEvent('POST', '/api/v1/dogs/{dogId}/chat', { body: {} }));
    expect(result.statusCode).toBe(400);
    // Error shape matches the API handler: { error: { code, message } }
    expect(JSON.parse(result.body).error).toEqual({ code: 'BAD_REQUEST', message: 'message is required' });
  });

  it('returns 403 for wrong household', async () => {
    ddbSend
      .mockResolvedValueOnce({ Item: { userId: 'user-1', householdId: 'hh-1' } })
      .mockResolvedValueOnce({ Item: { dogId: 'dog-1', householdId: 'hh-other' } });

    const result = await handler(mockEvent('POST', '/api/v1/dogs/{dogId}/chat', { body: { message: 'hi' } }));
    expect(result.statusCode).toBe(403);
  });

  it('returns 404 for unknown route', async () => {
    ddbSend
      .mockResolvedValueOnce({ Item: { userId: 'user-1', householdId: 'hh-1' } })
      .mockResolvedValueOnce({ Item: { dogId: 'dog-1', householdId: 'hh-1' } });

    const result = await handler(mockEvent('DELETE', '/api/v1/dogs/{dogId}/chat/unknown'));
    expect(result.statusCode).toBe(404);
  });

  it('returns session list', async () => {
    ddbSend
      .mockResolvedValueOnce({ Item: { userId: 'user-1', householdId: 'hh-1' } })
      .mockResolvedValueOnce({ Item: { dogId: 'dog-1', householdId: 'hh-1' } })
      .mockResolvedValueOnce({ Items: [
        { sessionId: 's1', createdAt: '2026-03-26T10:00:00Z' },
        { sessionId: 's2', createdAt: '2026-03-25T10:00:00Z' },
      ] });

    const result = await handler(mockEvent('GET', '/api/v1/dogs/{dogId}/chat/sessions'));
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveLength(2);
    expect(body[0].sessionId).toBe('s1');
  });

  it('returns 404 for missing session', async () => {
    ddbSend
      .mockResolvedValueOnce({ Item: { userId: 'user-1', householdId: 'hh-1' } })
      .mockResolvedValueOnce({ Item: { dogId: 'dog-1', householdId: 'hh-1' } })
      .mockResolvedValueOnce({ Item: undefined });

    const result = await handler(mockEvent('GET', '/api/v1/dogs/{dogId}/chat/sessions/{sessionId}', {
      pathParameters: { dogId: 'dog-1', sessionId: 's1' },
    }));
    expect(result.statusCode).toBe(404);
  });
});
