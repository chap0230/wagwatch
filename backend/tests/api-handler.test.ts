import { handler, response } from '../src/api-handler';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock DynamoDB
jest.mock('../src/db', () => ({
  ddb: { send: jest.fn() },
  Tables: {
    households: 'households',
    users: 'users',
    dogs: 'dogs',
    events: 'events',
    medications: 'medications',
  },
}));

const { ddb } = require('../src/db');

const mockEvent = (method: string, resource: string, opts: {
  body?: any;
  pathParameters?: Record<string, string>;
} = {}): APIGatewayProxyEvent =>
  ({
    httpMethod: method,
    resource,
    path: resource,
    body: opts.body ? JSON.stringify(opts.body) : null,
    pathParameters: opts.pathParameters || null,
    headers: {},
    queryStringParameters: null,
    requestContext: {
      authorizer: {
        claims: { sub: 'user-123', email: 'test@example.com' },
      },
    },
  } as any);

describe('api-handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 for unknown routes', async () => {
    // Mock extractContext: user lookup returns no item (new user)
    ddb.send
      .mockResolvedValueOnce({ Item: undefined }) // extractContext: get user
      .mockResolvedValueOnce({}); // ensureUser: put user

    const result = await handler(mockEvent('GET', '/api/v1/unknown'));
    expect(result.statusCode).toBe(404);
  });

  it('creates a household', async () => {
    ddb.send
      .mockResolvedValueOnce({ Item: { userId: 'user-123' } }) // extractContext
      .mockResolvedValueOnce({ Item: { userId: 'user-123' } }) // ensureUser check
      .mockResolvedValueOnce({}) // put household
      .mockResolvedValueOnce({}); // update user

    const result = await handler(mockEvent('POST', '/api/v1/households', {
      body: { name: 'My Family' },
    }));

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.name).toBe('My Family');
    expect(body.householdId).toBeDefined();
    expect(body.inviteCode).toBeDefined();
  });

  it('rejects household creation without name', async () => {
    ddb.send
      .mockResolvedValueOnce({ Item: { userId: 'user-123' } })
      .mockResolvedValueOnce({ Item: { userId: 'user-123' } });

    const result = await handler(mockEvent('POST', '/api/v1/households', { body: {} }));
    expect(result.statusCode).toBe(400);
  });

  it('response helper sets CORS headers', () => {
    const res = response(200, { ok: true });
    expect(res.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(res.headers?.['Content-Type']).toBe('application/json');
  });
});
