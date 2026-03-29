import * as esbuild from 'esbuild';

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outdir: 'dist',
  external: ['@aws-sdk/*'],
  sourcemap: true,
  minify: false,
};

await esbuild.build({ ...shared, entryPoints: ['src/api-handler.ts'] });
await esbuild.build({ ...shared, entryPoints: ['src/chat-handler.ts'] });

console.log('✅ Lambda bundles built');
