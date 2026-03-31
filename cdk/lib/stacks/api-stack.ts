import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

interface ApiStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  householdsTable: dynamodb.Table;
  usersTable: dynamodb.Table;
  dogsTable: dynamodb.Table;
  eventsTable: dynamodb.Table;
  medicationsTable: dynamodb.Table;
  photosBucket: s3.Bucket;
  chatSessionsTable: dynamodb.Table;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly apiHandler: lambda.Function;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    this.apiHandler = new lambda.Function(this, 'ApiHandler', {
      functionName: 'dog-tracker-api',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'api-handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/dist')),
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      environment: {
        HOUSEHOLDS_TABLE: props.householdsTable.tableName,
        USERS_TABLE: props.usersTable.tableName,
        DOGS_TABLE: props.dogsTable.tableName,
        EVENTS_TABLE: props.eventsTable.tableName,
        MEDICATIONS_TABLE: props.medicationsTable.tableName,
        PHOTOS_BUCKET: props.photosBucket.bucketName,
      },
    });

    props.householdsTable.grantReadWriteData(this.apiHandler);
    props.usersTable.grantReadWriteData(this.apiHandler);
    props.dogsTable.grantReadWriteData(this.apiHandler);
    props.eventsTable.grantReadWriteData(this.apiHandler);
    props.medicationsTable.grantReadWriteData(this.apiHandler);
    props.photosBucket.grantReadWrite(this.apiHandler);

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
    });

    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: 'dog-tracker-api',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    const defaultMethodOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    const integration = new apigateway.LambdaIntegration(this.apiHandler);

    // /api/v1
    const v1 = this.api.root.addResource('api').addResource('v1');

    // Households
    const households = v1.addResource('households');
    households.addMethod('POST', integration, defaultMethodOptions);
    const household = households.addResource('{householdId}');
    household.addMethod('GET', integration, defaultMethodOptions);
    household.addResource('invite').addMethod('POST', integration, defaultMethodOptions);
    household.addResource('remove-member').addMethod('POST', integration, defaultMethodOptions);
    households.addResource('join').addMethod('POST', integration, defaultMethodOptions);

    // Dogs
    const dogs = v1.addResource('dogs');
    dogs.addMethod('POST', integration, defaultMethodOptions);
    dogs.addMethod('GET', integration, defaultMethodOptions);
    const dog = dogs.addResource('{dogId}');
    dog.addMethod('GET', integration, defaultMethodOptions);
    dog.addMethod('PUT', integration, defaultMethodOptions);
    dog.addResource('photo-upload-url').addMethod('POST', integration, defaultMethodOptions);

    // Events
    const events = dog.addResource('events');
    events.addMethod('POST', integration, defaultMethodOptions);
    events.addMethod('GET', integration, defaultMethodOptions);
    const event = events.addResource('{eventId}');
    event.addMethod('GET', integration, defaultMethodOptions);
    event.addMethod('PUT', integration, defaultMethodOptions);
    event.addMethod('DELETE', integration, defaultMethodOptions);

    // Daily summary
    const dailySummary = dog.addResource('daily-summary');
    dailySummary.addMethod('POST', integration, defaultMethodOptions);
    dailySummary.addResource('{date}').addMethod('GET', integration, defaultMethodOptions);

    // Medications
    const medications = dog.addResource('medications');
    medications.addMethod('POST', integration, defaultMethodOptions);
    medications.addMethod('GET', integration, defaultMethodOptions);
    const medication = medications.addResource('{medicationId}');
    medication.addMethod('PUT', integration, defaultMethodOptions);
    medication.addResource('stop').addMethod('PUT', integration, defaultMethodOptions);

    // Chat (separate Lambda — longer timeout, Bedrock access)
    const chatHandler = new lambda.Function(this, 'ChatHandler', {
      functionName: 'dog-tracker-chat',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'chat-handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/dist')),
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      environment: {
        DOGS_TABLE: props.dogsTable.tableName,
        EVENTS_TABLE: props.eventsTable.tableName,
        MEDICATIONS_TABLE: props.medicationsTable.tableName,
        USERS_TABLE: props.usersTable.tableName,
        CHAT_SESSIONS_TABLE: props.chatSessionsTable.tableName,
        MODEL_ID: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      },
    });
    props.dogsTable.grantReadData(chatHandler);
    props.eventsTable.grantReadData(chatHandler);
    props.medicationsTable.grantReadData(chatHandler);
    props.usersTable.grantReadData(chatHandler);
    props.chatSessionsTable.grantReadWriteData(chatHandler);
    chatHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:*::foundation-model/anthropic.*'],
    }));

    const chatIntegration = new apigateway.LambdaIntegration(chatHandler);
    const chat = dog.addResource('chat');
    chat.addMethod('POST', chatIntegration, defaultMethodOptions);
    const chatSessions = chat.addResource('sessions');
    chatSessions.addMethod('GET', chatIntegration, defaultMethodOptions);
    chatSessions.addResource('{sessionId}').addMethod('GET', chatIntegration, defaultMethodOptions);

    // Reports
    const reports = dog.addResource('reports');
    reports.addResource('trends').addMethod('GET', integration, defaultMethodOptions);
    reports.addResource('export').addMethod('GET', integration, defaultMethodOptions);

    new cdk.CfnOutput(this, 'ApiUrl', { value: this.api.url });
  }
}
