import * as cdk from 'aws-cdk-lib/core';
import { Template } from 'aws-cdk-lib/assertions';
import { StorageStack } from '../lib/stacks/storage-stack';

describe('StorageStack', () => {
  const app = new cdk.App();
  const stack = new StorageStack(app, 'TestStorage');
  const template = Template.fromStack(stack);

  it('creates an S3 bucket with public access blocked', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it('has CORS configured for PUT and GET', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      CorsConfiguration: {
        CorsRules: [{
          AllowedMethods: ['PUT', 'GET'],
          AllowedOrigins: ['*'],
          AllowedHeaders: ['*'],
        }],
      },
    });
  });
});
