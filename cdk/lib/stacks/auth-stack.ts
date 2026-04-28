import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';

interface AuthStackProps extends cdk.StackProps {
  callbackUrls?: string[];
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: AuthStackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'dog-tracker-user-pool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: false },
        givenName: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Google IdP — see README.md for setup instructions
    // Uncomment after configuring Google OAuth credentials:
    //
    // new cognito.UserPoolIdentityProviderGoogle(this, 'Google', {
    //   userPool: this.userPool,
    //   clientId: '<GOOGLE_CLIENT_ID>',
    //   clientSecretValue: cdk.SecretValue.secretsManager('dog-tracker/google-oauth', { jsonField: 'clientSecret' }),
    //   scopes: ['email', 'profile', 'openid'],
    //   attributeMapping: {
    //     email: cognito.ProviderAttribute.GOOGLE_EMAIL,
    //     givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
    //   },
    // });

    const callbackUrls = ['http://localhost:5173/', ...(props?.callbackUrls || [])];
    const logoutUrls = ['http://localhost:5173/', ...(props?.callbackUrls || [])];

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'dog-tracker-web-client',
      generateSecret: false,
      // userSrp only — userPassword flow transmits the password in the clear
      // inside the request body and is not needed by Amplify's default client.
      authFlows: { userSrp: true },
      // Return the same generic error for "unknown user" and "bad password"
      // so attackers can't enumerate registered emails.
      preventUserExistenceErrors: true,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls,
        logoutUrls,
      },
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
    });

    const domain = this.userPool.addDomain('CognitoDomain', {
      cognitoDomain: { domainPrefix: `dog-tracker-${cdk.Aws.ACCOUNT_ID}` },
    });

    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: `${domain.domainName}.auth.${cdk.Aws.REGION}.amazoncognito.com`,
    });
  }
}
