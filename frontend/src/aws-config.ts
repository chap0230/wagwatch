const userPoolId = import.meta.env.VITE_USER_POOL_ID || '';
const userPoolClientId = import.meta.env.VITE_USER_POOL_CLIENT_ID || '';
const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN || '';

export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      ...(cognitoDomain ? {
        loginWith: {
          oauth: {
            domain: cognitoDomain,
            scopes: ['email', 'openid', 'profile'],
            redirectSignIn: [window.location.origin + '/'],
            redirectSignOut: [window.location.origin + '/'],
            responseType: 'code' as const,
          },
        },
      } : {}),
    },
  },
};
