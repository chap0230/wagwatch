
import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

interface StorageStackProps extends cdk.StackProps {
  /** Origins allowed to PUT/GET photos via the browser. Defaults to localhost dev only. */
  allowedOrigins?: string[];
}

export class StorageStack extends cdk.Stack {
  public readonly photosBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: StorageStackProps) {
    super(scope, id, props);

    const allowedOrigins = props?.allowedOrigins?.length
      ? props.allowedOrigins
      : ['http://localhost:5173'];

    this.photosBucket = new s3.Bucket(this, 'PhotosBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [{
        allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
        allowedOrigins,
        allowedHeaders: ['*'],
        maxAge: 3600,
      }],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cdk.CfnOutput(this, 'PhotosBucketName', { value: this.photosBucket.bucketName });
  }
}
