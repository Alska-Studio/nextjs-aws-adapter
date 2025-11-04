import type { ManifestHeaderRoute, ManifestRedirectRoute, ManifestRewriteRoute, ManifestRoute } from "next/dist/build";
import type { AdapterOutputs, NextConfigComplete } from "next/dist/server/config-shared";

export interface NextAdapter {
  name: string
  modifyConfig?: (
    config: NextConfigComplete,
    ctx: {
      phase: string;
    }
  ) => Promise<NextConfigComplete> | NextConfigComplete
  onBuildComplete?: (ctx: {
    routes: {
      headers: Array<ManifestHeaderRoute>
      redirects: Array<ManifestRedirectRoute>
      rewrites: {
        beforeFiles: Array<ManifestRewriteRoute>
        afterFiles: Array<ManifestRewriteRoute>
        fallback: Array<ManifestRewriteRoute>
      }
      dynamicRoutes: ReadonlyArray<ManifestRoute>
    }
    outputs: AdapterOutputs
    projectDir: string
    repoRoot: string
    distDir: string
    config: NextConfigComplete
    nextVersion: string
  }) => Promise<void> | void
}

/** @type {import('next').NextAdapter} */
const adapter: NextAdapter = {
  name: 'nextjs-aws-adapter',

  async modifyConfig(config, { phase }) {
    if (phase === 'phase-production-build') {
      // Modify the Next.js config based on the build phase
      return { ...config }
    }
    return config
  },

  async onBuildComplete({ routes, outputs, projectDir, repoRoot, distDir, config, nextVersion }) {
    // Process the build output
    console.log('Build completed...');
  }
}

export default adapter;
