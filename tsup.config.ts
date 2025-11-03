import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    outDir: 'dist',
    outExtension: () => ({ js: '.mjs' }),
  },
  {
    entry: ['src/handler/index.ts'], // NextJS and Payload cannot run ESM yet
    format: ['cjs'],
    outDir: 'dist/handler',
    outExtension: () => ({ js: '.js' }),
  },
]);
