import * as cdk from 'aws-cdk-lib/core';
import { Template } from 'aws-cdk-lib/assertions';
import { DatabaseStack } from '../lib/stacks/database-stack';

describe('DatabaseStack', () => {
  const app = new cdk.App();
  const stack = new DatabaseStack(app, 'TestDatabase');
  const template = Template.fromStack(stack);

  it('creates 6 DynamoDB tables', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 6);
  });

  it('all tables use PAY_PER_REQUEST billing', () => {
    const tables = template.findResources('AWS::DynamoDB::Table');
    for (const [, table] of Object.entries(tables)) {
      expect((table as any).Properties.BillingMode).toBe('PAY_PER_REQUEST');
    }
  });

  it('events table has composite key (dogId + eventId)', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'dog-tracker-events',
      KeySchema: [
        { AttributeName: 'dogId', KeyType: 'HASH' },
        { AttributeName: 'eventId', KeyType: 'RANGE' },
      ],
    });
  });

  it('events table has dogId-date GSI', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'dog-tracker-events',
      GlobalSecondaryIndexes: [
        {
          IndexName: 'dogId-date-index',
          KeySchema: [
            { AttributeName: 'dogId', KeyType: 'HASH' },
            { AttributeName: 'date', KeyType: 'RANGE' },
          ],
        },
      ],
    });
  });

  it('chat sessions table has TTL enabled', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'dog-tracker-chat-sessions',
      TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true },
    });
  });
});
