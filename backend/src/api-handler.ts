import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { extractContext } from './auth-context';
import { ensureUser, createHousehold, getHousehold, createInvite, joinHousehold, removeMember } from './handlers/households';
import { createDog, listDogs, getDog, updateDog, getPhotoUploadUrl } from './handlers/dogs';
import { createEvent, listEvents, getEvent, updateEvent, deleteEvent, getDailySummary } from './handlers/events';
import { createMedication, listMedications, updateMedication, stopMedication } from './handlers/medications';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await extractContext(event);
    await ensureUser(ctx);

    const { httpMethod: method, resource } = event;
    const body = event.body ? JSON.parse(event.body) : {};
    const params = event.pathParameters || {};

    let result: { statusCode: number; data?: any; error?: string };

    switch (`${method} ${resource}`) {
      // Households
      case 'POST /api/v1/households':
        result = await createHousehold(ctx, body);
        break;
      case 'GET /api/v1/households/{householdId}':
        result = await getHousehold(params.householdId!, ctx);
        break;
      case 'POST /api/v1/households/{householdId}/invite':
        result = await createInvite(params.householdId!, ctx);
        break;
      case 'POST /api/v1/households/{householdId}/remove-member':
        result = await removeMember(params.householdId!, ctx, body);
        break;
      case 'POST /api/v1/households/join':
        result = await joinHousehold(ctx, body);
        break;

      // Dogs
      case 'POST /api/v1/dogs':
        result = await createDog(ctx, body);
        break;
      case 'GET /api/v1/dogs':
        result = await listDogs(ctx);
        break;
      case 'GET /api/v1/dogs/{dogId}':
        result = await getDog(params.dogId!, ctx);
        break;
      case 'PUT /api/v1/dogs/{dogId}':
        result = await updateDog(params.dogId!, ctx, body);
        break;
      case 'POST /api/v1/dogs/{dogId}/photo-upload-url':
        result = await getPhotoUploadUrl(params.dogId!, ctx, body);
        break;

      // Events
      case 'POST /api/v1/dogs/{dogId}/events':
        result = await createEvent(params.dogId!, ctx, body);
        break;
      case 'GET /api/v1/dogs/{dogId}/events':
        result = await listEvents(params.dogId!, ctx, event.queryStringParameters || {});
        break;
      case 'GET /api/v1/dogs/{dogId}/events/{eventId}':
        result = await getEvent(params.dogId!, params.eventId!, ctx);
        break;
      case 'PUT /api/v1/dogs/{dogId}/events/{eventId}':
        result = await updateEvent(params.dogId!, params.eventId!, ctx, body);
        break;
      case 'DELETE /api/v1/dogs/{dogId}/events/{eventId}':
        result = await deleteEvent(params.dogId!, params.eventId!, ctx);
        break;

      // Daily Summary
      case 'GET /api/v1/dogs/{dogId}/daily-summary/{date}':
        result = await getDailySummary(params.dogId!, params.date!, ctx);
        break;

      // Medications
      case 'POST /api/v1/dogs/{dogId}/medications':
        result = await createMedication(params.dogId!, ctx, body);
        break;
      case 'GET /api/v1/dogs/{dogId}/medications':
        result = await listMedications(params.dogId!, ctx, event.queryStringParameters || {});
        break;
      case 'PUT /api/v1/dogs/{dogId}/medications/{medicationId}':
        result = await updateMedication(params.dogId!, params.medicationId!, ctx, body);
        break;
      case 'PUT /api/v1/dogs/{dogId}/medications/{medicationId}/stop':
        result = await stopMedication(params.dogId!, params.medicationId!, ctx);
        break;

      default:
        result = { statusCode: 404, error: `No route for ${method} ${resource}` };
    }

    return response(result.statusCode, result.error ? { error: { code: 'ERROR', message: result.error } } : result.data);
  } catch (err) {
    console.error('Unhandled error', err);
    return response(500, { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

export function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}
