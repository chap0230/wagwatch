#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { StorageStack } from '../lib/stacks/storage-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_DEFAULT_REGION || 'us-west-2',
};

const databaseStack = new DatabaseStack(app, 'DogTrackerDatabase', { env });
const frontendStack = new FrontendStack(app, 'DogTrackerFrontend', { env });

// Origins allowed to PUT/GET photos and call the API via the browser.
const appOrigins = [frontendStack.distributionUrl, 'http://localhost:5173'];

const storageStack = new StorageStack(app, 'DogTrackerStorage', {
  env,
  allowedOrigins: appOrigins,
});

// Auth stack gets the CloudFront URL as a callback
const authStack = new AuthStack(app, 'DogTrackerAuth', {
  env,
  callbackUrls: [`${frontendStack.distributionUrl}/`],
});

new ApiStack(app, 'DogTrackerApi', {
  env,
  userPool: authStack.userPool,
  householdsTable: databaseStack.householdsTable,
  usersTable: databaseStack.usersTable,
  dogsTable: databaseStack.dogsTable,
  eventsTable: databaseStack.eventsTable,
  medicationsTable: databaseStack.medicationsTable,
  photosBucket: storageStack.photosBucket,
  chatSessionsTable: databaseStack.chatSessionsTable,
});
