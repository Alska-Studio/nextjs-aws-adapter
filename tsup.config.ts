import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['lib/index.ts'],
    format: ['cjs'],
    dts: { entry: 'lib/index.ts' },
    outDir: 'dist',
    outExtension: () => ({ js: '.js' }),
  },
  {
    entry: ['lib/cli.ts'],
    format: ['cjs'],
    outDir: 'dist',
    outExtension: () => ({ js: '.js' }),
  },
  {
    entry: ['lib/cdk/app.ts'],
    format: ['cjs'],
    outDir: 'dist/cdk',
    outExtension: () => ({ js: '.js' }),
  },
  {
    entry: ['lib/server-handler/index.ts'],
    format: ['cjs'],
    outDir: 'dist/server-handler',
    outExtension: () => ({ js: '.js' }),
  },
]);
