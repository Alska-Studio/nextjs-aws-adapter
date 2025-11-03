import type { aws_wafv2 as wafV2, Duration } from 'aws-cdk-lib';
import type { BundlingOptions } from 'aws-cdk-lib/aws-lambda-nodejs';
import type * as lambda from 'aws-cdk-lib/aws-lambda';

interface NextjsPropsFunctionAssociation {
  file: string;
  description: string;
  associateKeyValueStore?: string;
}

export type WafRule = wafV2.CfnWebACL.RuleProperty;

/**
 * Lambda Memory/vCPU Reference Table
 * https://stackoverflow.com/a/66523153
 *
 * Memory (MB)      Estimated vCPUs    Price per 100ms    Price per 1s
 * ===================================================================
 * 128              <1 vCPU            $0.00213           $0.02133     ✅
 * 1792             ~1 vCPU            $0.02987           $0.29867     ✅
 * 3008             ~2 vCPUs           $0.05013           $0.50133     ✅ ← Max memory for origin lambda (see: https://www.serverless.com/framework/docs/providers/aws/events/cloudfront)
 * 5120             ~3 vCPUs           $0.08533           $0.85333     ❌
 * 7040             ~4 vCPUs           $0.11733           $1.17333     ❌
 * 8960             ~5 vCPUs           $0.14933           $1.49333     ❌
 * 10240            ~6 vCPUs           $0.17067           $1.70667     ❌
 */
export interface NextjsProps {
  stackNamePrefix?: string;
  vars: {
    stage: string;
    brand: string;
    brandSlug: string;
  };
  cdn?: Partial<{
    domainNames: string[];
    certificateArn: string;
    alternateNames: string[];
    waf?: {
      enabled: boolean;
      rules: WafRule[];
    };
    functionAssociations?: Partial<{
      viewerRequest: NextjsPropsFunctionAssociation;
      viewerResponse: NextjsPropsFunctionAssociation;
      originRequest: NextjsPropsFunctionAssociation;
      originResponse: NextjsPropsFunctionAssociation;
    }>;
  }>,
  app: {
    entryDir: string;
    cookieAllowList?: string[];
    lambdaOptions?: Partial<{
      architecture: lambda.Architecture;
      runtime: lambda.Runtime; // Default: Runtime.NODEJS_22_X
      memorySize: number; // Default: 1024mb
      timeout: Duration; // Default: Duration.minutes(3)
      bundling: BundlingOptions;
    }>;
  };
  api?: {
    entryDir: string;
    prefix: string;
    lambdaOptions?: Partial<{
      architecture: lambda.Architecture; // Default: Architecture.ARM_64
      runtime: lambda.Runtime; // Default: Runtime.NODEJS_22_X
      memorySize: number; // Default: 1024mb
      timeout: Duration; // Default: Duration.seconds(29)
      bundling: BundlingOptions;
    }>;
  },
  lambdas?: {
    entryDir: string;
    lambdaOptions?: Partial<{
      architecture: lambda.Architecture; // Default: Architecture.ARM_64
      runtime: lambda.Runtime; // Default: Runtime.NODEJS_22_X
      memorySize: number; // Default: 1024mb
      timeout: Duration; // Default: Duration.seconds(29)
      bundling: BundlingOptions;
    }>;
  }
}
