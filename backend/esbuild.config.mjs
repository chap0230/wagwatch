import * as esbuild from 'esbuild';

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outdir: 'dist',
  external: ['@aws-sdk/*'],
  // No source maps in deployed Lambda artifacts — they inflate the bundle
  // and make it easier to reverse engineer. Enable locally via DEV_BUILD=1.
  sourcemap: process.env.DEV_BUILD === '1',
  minify: false,
};

await esbuild.build({ ...shared, entryPoints: ['src/api-handler.ts'] });
await esbuild.build({ ...shared, entryPoints: ['src/chat-handler.ts'] });

console.log('✅ Lambda bundles built');
