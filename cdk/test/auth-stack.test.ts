import * as cdk from 'aws-cdk-lib/core';
import { Template } from 'aws-cdk-lib/assertions';
import { AuthStack } from '../lib/stacks/auth-stack';

describe('AuthStack', () => {
  const app = new cdk.App();
  const stack = new AuthStack(app, 'TestAuth', { callbackUrls: ['https://example.cloudfront.net/'] });
  const template = Template.fromStack(stack);

  it('creates a Cognito User Pool with email sign-in', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'dog-tracker-user-pool',
      AutoVerifiedAttributes: ['email'],
      UsernameAttributes: ['email'],
    });
  });

  it('creates a User Pool Client without secret', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      ClientName: 'dog-tracker-web-client',
      GenerateSecret: false,
    });
  });

  it('creates a Cognito domain', () => {
    template.resourceCountIs('AWS::Cognito::UserPoolDomain', 1);
  });

  it('outputs User Pool ID and Client ID', () => {
    template.hasOutput('UserPoolId', {});
    template.hasOutput('UserPoolClientId', {});
    template.hasOutput('CognitoDomain', {});
  });
});
