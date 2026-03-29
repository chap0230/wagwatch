import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { v4 as uuid } from 'uuid';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({});

const DOGS_TABLE = process.env.DOGS_TABLE!;
const EVENTS_TABLE = process.env.EVENTS_TABLE!;
const MEDICATIONS_TABLE = process.env.MEDICATIONS_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;
const CHAT_SESSIONS_TABLE = process.env.CHAT_SESSIONS_TABLE!;
const MODEL_ID = process.env.MODEL_ID || 'anthropic.claude-3-5-haiku-20241022-v1:0';

const TOOL_DEFINITIONS = [
  {
    toolSpec: {
      name: 'get_events',
      description: 'Get health events for a dog within a date range, optionally filtered by event type',
      inputSchema: { json: { type: 'object', properties: {
        dogId: { type: 'string' }, startDate: { type: 'string' }, endDate: { type: 'string' },
        eventType: { type: 'string', enum: ['ACCIDENT', 'MEDICAL', 'BEHAVIOR', 'NIGHT_NOTE', 'DAY_RATING'] },
      }, required: ['dogId', 'startDate', 'endDate'] } },
    },
  },
  {
    toolSpec: {
      name: 'get_medications',
      description: 'Get current and historical medications/supplements for a dog',
      inputSchema: { json: { type: 'object', properties: {
        dogId: { type: 'string' }, includeHistory: { type: 'boolean' },
      }, required: ['dogId'] } },
    },
  },
  {
    toolSpec: {
      name: 'get_dog_profile',
      description: 'Get the dog profile including age, breed, weight, conditions, and allergies',
      inputSchema: { json: { type: 'object', properties: { dogId: { type: 'string' } }, required: ['dogId'] } },
    },
  },
];

// Tool execution — dogId is injected from request context, not from Claude's input
async function executeTool(name: string, input: any, dogId: string): Promise<string> {
  console.log(`Tool call: ${name}`, JSON.stringify(input));
  switch (name) {
    case 'get_events': {
      const params: any = {
        TableName: EVENTS_TABLE, IndexName: 'dogId-date-index',
        KeyConditionExpression: 'dogId = :did AND #d BETWEEN :start AND :end',
        ExpressionAttributeNames: { '#d': 'date' },
        ExpressionAttributeValues: { ':did': dogId, ':start': input.startDate, ':end': input.endDate },
      };
      if (input.eventType) {
        params.FilterExpression = 'eventType = :type';
        params.ExpressionAttributeValues[':type'] = input.eventType;
      }
      const result = await ddb.send(new QueryCommand(params));
      console.log(`Tool result: ${name} returned ${result.Items?.length ?? 0} items`);
      return JSON.stringify(result.Items || []);
    }
    case 'get_medications': {
      const result = await ddb.send(new QueryCommand({
        TableName: MEDICATIONS_TABLE,
        KeyConditionExpression: 'dogId = :did',
        ExpressionAttributeValues: { ':did': dogId },
      }));
      let items = result.Items || [];
      if (!input.includeHistory) items = items.filter((m: any) => m.status === 'ACTIVE');
      console.log(`Tool result: ${name} returned ${items.length} items`);
      return JSON.stringify(items);
    }
    case 'get_dog_profile': {
      const result = await ddb.send(new GetCommand({ TableName: DOGS_TABLE, Key: { dogId } }));
      console.log(`Tool result: ${name} returned profile: ${!!result.Item}`);
      return JSON.stringify(result.Item || {});
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

function buildSystemPrompt(dog: any, meds: any[]): string {
  const age = Math.floor((Date.now() - new Date(dog.dateOfBirth).getTime()) / 31557600000);
  const activeMeds = meds.filter((m: any) => m.status === 'ACTIVE').map((m: any) => `${m.name} ${m.dosage} (${m.frequency})`).join(', ');
  return `You are a compassionate senior dog health assistant helping track the health of ${dog.name}, a ${age}-year-old ${dog.breed}.
You have access to tools to query health data. Always fetch relevant data before answering.
The dog's ID for tool calls is: ${dog.dogId}
Provide clear, caring insights. Suggest consulting a veterinarian when you notice concerning patterns.
Known conditions: ${(dog.conditions || []).join(', ') || 'None listed'}.
Current medications: ${activeMeds || 'None'}.
Today's date: ${new Date().toISOString().slice(0, 10)}.
Keep responses concise and mobile-friendly.`;
}

async function converseWithTools(dogId: string, messages: any[]): Promise<{ response: string; messages: any[] }> {
  // Load dog context
  const [dogResult, medsResult] = await Promise.all([
    ddb.send(new GetCommand({ TableName: DOGS_TABLE, Key: { dogId } })),
    ddb.send(new QueryCommand({ TableName: MEDICATIONS_TABLE, KeyConditionExpression: 'dogId = :did', ExpressionAttributeValues: { ':did': dogId } })),
  ]);

  const systemPrompt = buildSystemPrompt(dogResult.Item || { name: 'Unknown', breed: 'Unknown', dateOfBirth: '2009-01-01' }, medsResult.Items || []);

  // Tool use loop (max 5 iterations)
  for (let i = 0; i < 5; i++) {
    const result = await bedrock.send(new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: systemPrompt }],
      messages,
      toolConfig: { tools: TOOL_DEFINITIONS as any },
      inferenceConfig: { maxTokens: 1024, temperature: 0.3 },
    }));

    const output = result.output!.message!;
    messages.push(output);

    if (result.stopReason === 'tool_use') {
      const toolUseBlocks = output.content!.filter((b: any) => b.toolUse);
      const toolResults: any[] = [];

      for (const block of toolUseBlocks) {
        const tu = (block as any).toolUse;
        const toolResult = await executeTool(tu.name, tu.input, dogId);
        toolResults.push({ toolResult: { toolUseId: tu.toolUseId, content: [{ text: toolResult }] } });
      }

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Extract text response
    const textBlock = output.content!.find((b: any) => b.text);
    return { response: (textBlock as any)?.text || 'I could not generate a response.', messages };
  }

  return { response: 'I ran into an issue processing your request. Please try again.', messages };
}

// Session management
async function loadSession(sessionId: string): Promise<any[]> {
  const result = await ddb.send(new GetCommand({ TableName: CHAT_SESSIONS_TABLE, Key: { sessionId } }));
  return result.Item?.messages || [];
}

async function saveSession(sessionId: string, userId: string, dogId: string, messages: any[]) {
  const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
  await ddb.send(new PutCommand({
    TableName: CHAT_SESSIONS_TABLE,
    Item: { sessionId, userId, dogId, messages, createdAt: new Date().toISOString(), ttl },
  }));
}

// Lambda handler
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const claims = event.requestContext.authorizer?.claims;
    if (!claims) return resp(401, { error: 'Unauthorized' });

    const userId = claims.sub as string;
    const params = event.pathParameters || {};
    const dogId = params.dogId!;

    // Verify dog access
    const userResult = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId } }));
    const dogResult = await ddb.send(new GetCommand({ TableName: DOGS_TABLE, Key: { dogId } }));
    if (!dogResult.Item || dogResult.Item.householdId !== userResult.Item?.householdId) {
      return resp(403, { error: 'Forbidden' });
    }

    const { httpMethod: method, resource } = event;

    if (method === 'POST' && resource.endsWith('/chat')) {
      const body = JSON.parse(event.body || '{}');
      const message = body.message;
      if (!message) return resp(400, { error: 'message is required' });

      const sessionId = body.sessionId || uuid();
      let messages = body.sessionId ? await loadSession(sessionId) : [];

      messages.push({ role: 'user', content: [{ text: message }] });

      const result = await converseWithTools(dogId, messages);
      await saveSession(sessionId, userId, dogId, result.messages);

      return resp(200, { sessionId, response: result.response });
    }

    if (method === 'GET' && resource.includes('/sessions/{sessionId}')) {
      const sessionId = params.sessionId!;
      const result = await ddb.send(new GetCommand({ TableName: CHAT_SESSIONS_TABLE, Key: { sessionId } }));
      if (!result.Item) return resp(404, { error: 'Session not found' });
      return resp(200, result.Item);
    }

    if (method === 'GET' && resource.includes('/sessions')) {
      const result = await ddb.send(new ScanCommand({
        TableName: CHAT_SESSIONS_TABLE,
        FilterExpression: 'userId = :uid AND dogId = :did',
        ExpressionAttributeValues: { ':uid': userId, ':did': dogId },
      }));
      const sessions = (result.Items || []).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);
      return resp(200, sessions.map((s: any) => ({ sessionId: s.sessionId, createdAt: s.createdAt })));
    }

    return resp(404, { error: 'Not found' });
  } catch (err) {
    console.error('Chat handler error', err);
    return resp(500, { error: 'Internal server error' });
  }
};

function resp(statusCode: number, body: any): APIGatewayProxyResult {
  return {
    statusCode, body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' },
  };
}
