import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DatabaseStack extends cdk.Stack {
  public readonly householdsTable: dynamodb.Table;
  public readonly usersTable: dynamodb.Table;
  public readonly dogsTable: dynamodb.Table;
  public readonly eventsTable: dynamodb.Table;
  public readonly medicationsTable: dynamodb.Table;
  public readonly chatSessionsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.householdsTable = new dynamodb.Table(this, 'Households', {
      tableName: 'dog-tracker-households',
      partitionKey: { name: 'householdId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.householdsTable.addGlobalSecondaryIndex({
      indexName: 'inviteCode-index',
      partitionKey: { name: 'inviteCode', type: dynamodb.AttributeType.STRING },
    });

    this.usersTable = new dynamodb.Table(this, 'Users', {
      tableName: 'dog-tracker-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'householdId-index',
      partitionKey: { name: 'householdId', type: dynamodb.AttributeType.STRING },
    });

    this.dogsTable = new dynamodb.Table(this, 'Dogs', {
      tableName: 'dog-tracker-dogs',
      partitionKey: { name: 'dogId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.dogsTable.addGlobalSecondaryIndex({
      indexName: 'householdId-index',
      partitionKey: { name: 'householdId', type: dynamodb.AttributeType.STRING },
    });

    this.eventsTable = new dynamodb.Table(this, 'Events', {
      tableName: 'dog-tracker-events',
      partitionKey: { name: 'dogId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.eventsTable.addGlobalSecondaryIndex({
      indexName: 'dogId-date-index',
      partitionKey: { name: 'dogId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
    });

    this.medicationsTable = new dynamodb.Table(this, 'Medications', {
      tableName: 'dog-tracker-medications',
      partitionKey: { name: 'dogId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'medicationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.chatSessionsTable = new dynamodb.Table(this, 'ChatSessions', {
      tableName: 'dog-tracker-chat-sessions',
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    // Lets a user list their chat sessions for a given dog without a Scan.
    this.chatSessionsTable.addGlobalSecondaryIndex({
      indexName: 'userId-dogId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'dogId', type: dynamodb.AttributeType.STRING },
    });
  }
}
