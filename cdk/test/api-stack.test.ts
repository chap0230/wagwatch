import * as cdk from 'aws-cdk-lib/core';
import { Template } from 'aws-cdk-lib/assertions';
import { ApiStack } from '../lib/stacks/api-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { StorageStack } from '../lib/stacks/storage-stack';

describe('ApiStack', () => {
  const app = new cdk.App();
  const db = new DatabaseStack(app, 'TestDb');
  const auth = new AuthStack(app, 'TestAuth2');
  const storage = new StorageStack(app, 'TestStorage2');
  const stack = new ApiStack(app, 'TestApi', {
    userPool: auth.userPool,
    householdsTable: db.householdsTable,
    usersTable: db.usersTable,
    dogsTable: db.dogsTable,
    eventsTable: db.eventsTable,
    medicationsTable: db.medicationsTable,
    photosBucket: storage.photosBucket,
    chatSessionsTable: db.chatSessionsTable,
  });
  const template = Template.fromStack(stack);

  it('creates a REST API', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'dog-tracker-api',
    });
  });

  it('creates a Cognito authorizer', () => {
    template.resourceCountIs('AWS::ApiGateway::Authorizer', 1);
  });

  it('creates the API Lambda function', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'dog-tracker-api',
      Runtime: 'nodejs20.x',
      Timeout: 15,
    });
  });

  it('creates the Chat Lambda with Bedrock permissions', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'dog-tracker-chat',
      Runtime: 'nodejs20.x',
      Timeout: 60,
      MemorySize: 512,
    });
  });

  it('outputs the API URL', () => {
    template.hasOutput('ApiUrl', {});
  });
});
