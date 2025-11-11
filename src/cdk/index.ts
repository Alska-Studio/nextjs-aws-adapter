import type { StackProps } from 'aws-cdk-lib';
import type { NextjsProps } from './types';
import type { DeepRequiredExcept } from '../types';

import fs from 'node:fs';

import { Construct } from 'constructs';
import { Duration, Stack } from 'aws-cdk-lib';
import { FunctionAssociation } from 'aws-cdk-lib/aws-cloudfront';
import { FunctionUrlOrigin, S3StaticWebsiteOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';

import { addServerFunctionUrl, getServer, setServerLambdaWarmer } from './resources/server';
import { getSitePolicy, getOriginRequestPolicy } from './resources/policies';
import { addStaticAssetsBucketDeployment, getStaticAssetsBucket } from './resources/buckets';
import { getCloudfrontDistribution, getKeyValueStores, getViewerRequestFunction, getViewerResponseFunction } from './resources/cdn';
import { addOutputs } from './resources/outputs';

export class CustomStack extends Stack {
  constructor (scope: Construct, id: string, props: NextjsProps, stackProps: StackProps) {
    super(scope, id, stackProps);
  }
}

export class NextjsApp {
  public dependencies: Record<string, Stack> = {};

  constructor (scope: Construct, id: string, props: NextjsProps, stackProps?: { env?: { region?: string; account?: string } }, customStacks?: typeof CustomStack[]) {
    if (props.cdn?.waf?.enabled) {
      // this.dependencies.wafStack = new WafStack(scope, `${id}-waf`, props, stackProps?.env);
    }

    const stack = new NextjsKit(scope, id, props, stackProps, this.dependencies);

    // Add dependencies to the stack
    for (const [key, dependency] of Object.entries(this.dependencies).filter(([_, dependency]) => dependency)) {
      stack.addDependency(dependency, `Need ${key} to be created first`);
    }

    if (customStacks) {
      for (const CustomStack of customStacks) {
        const customStackInstance = new CustomStack(scope, id, props, stackProps ?? {});
        customStackInstance.addDependency(stack);
        // stack.addDependency(customStackInstance, `Need ${customStackInstance.stackId} to be created first`);
      }
    }
  }
}

export class NextjsKit extends Stack {
  constructor (scope: Construct, id: string, props: NextjsProps, stackProps?: { env?: { region?: string; account?: string } }, dependencies?: Record<string, Stack>) {
    super(scope, id, {
      ...stackProps,
      crossRegionReferences: props.cdn?.waf?.enabled ? true : undefined
    });

    const sitePolicy = getSitePolicy(this, props);

    const serverFunction = getServer(this, props);
    setServerLambdaWarmer(this, serverFunction, Duration.minutes(5));

    const functionUrl = addServerFunctionUrl(this, serverFunction);
    const functionUrlOrigin = new FunctionUrlOrigin(functionUrl);

    const clientBucket = getStaticAssetsBucket(this);
    addStaticAssetsBucketDeployment(this, clientBucket, props);

    const staticAssetsBucketOrigin = new S3StaticWebsiteOrigin(clientBucket);

    const functionAssociations: FunctionAssociation[] = [];
    const functionAssociationsExists = Object.keys(props.cdn?.functionAssociations ?? {}).some((file) => {
      return fs.existsSync(file);
    });

    if (functionAssociationsExists) {
      // Get all unique key value stores from the function associations and create a KeyValueStore for each
      const keyValueStores = getKeyValueStores(this, props);

      if (props.cdn?.functionAssociations?.viewerRequest) {
        console.log('[Cloudfront] Viewer Request function ->', props.cdn.functionAssociations.viewerRequest);
        functionAssociations.push(getViewerRequestFunction(
          this, props as DeepRequiredExcept<NextjsProps, 'cdn.functionAssociations.viewerRequest'>, keyValueStores
        ));
      }

      if (props.cdn?.functionAssociations?.viewerResponse) {
        console.log('[Cloudfront] Viewer Request function ->', props.cdn.functionAssociations.viewerResponse);
        functionAssociations.push(getViewerResponseFunction(
          this,props as DeepRequiredExcept<NextjsProps, 'cdn.functionAssociations.viewerResponse'>, keyValueStores
        ));
      }
    }

    const cloudfront = getCloudfrontDistribution(this, {
      functionUrlOrigin,
      staticAssetsBucketOrigin,
      functionAssociations,
      siteOriginRequestPolicy: getOriginRequestPolicy(this, props),
      sitePolicy
      // wafStack: this.dependencies.wafStack,
    }, props);

    addOutputs(this, id, { cloudfront }, props);
  }
}
