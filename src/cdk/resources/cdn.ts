import type { NextjsProps } from '../types';
import type { DeepRequiredExcept } from '../../types';

import * as cdk from 'aws-cdk-lib/aws-cloudfront';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { FunctionUrlOrigin, S3StaticWebsiteOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export const getKeyValueStores = (scope: Stack, props: NextjsProps) => {
  return Array.from(Object.values(props.cdn?.functionAssociations ?? {})
    .reduce((acc, kvs) => {
      const keyValueStoreName = kvs.associateKeyValueStore?.trim();
      if (keyValueStoreName) {
        acc.add(keyValueStoreName);
      }
      return acc;
    }, new Set<string>()))
    .reduce((acc, keyValueStoreName) => {
      acc[keyValueStoreName] = new cdk.KeyValueStore(scope, `KeyValueStore-${keyValueStoreName}`, {
        keyValueStoreName
      });
      return acc;
    }, {} as Record<string, cdk.KeyValueStore>);
};

export const getViewerRequestFunction = (scope: Stack, props: DeepRequiredExcept<NextjsProps, 'cdn.functionAssociations.viewerResponse'>, keyValueStores: Record<string, cdk.KeyValueStore>) => {
  const viewerRequestFunction = new cdk.Function(scope, 'ViewerRequestCloudfrontFunction', {
    functionName: `${props.stackNamePrefix}-viewer-request-function`,
    runtime: cdk.FunctionRuntime.JS_2_0, // Improved performance, lower latency, increased memory and size as well as support of more features (default: 'cloudfront-js-1.0')
    comment: 'Viewer request CloudFront function for intercepting requests',
    code: cdk.FunctionCode.fromFile({
      filePath: props.cdn.functionAssociations.viewerRequest.file
    }),
    keyValueStore: keyValueStores[props.cdn.functionAssociations?.viewerResponse?.associateKeyValueStore ?? ''],
    autoPublish: true
  });

  return {
    eventType: cdk.FunctionEventType.VIEWER_REQUEST,
    function: viewerRequestFunction
  };

  /*
  const viewerRequestFunction = new CfnFunction(this, 'ViewerRequestCloudfrontFunction', {
    name: `${props.stackNamePrefix}-viewer-request-function`,
    functionCode: fs.readFileSync(props.cdn?.functionAssociations?.viewerRequest?.file, 'utf-8'),
    functionConfig: {
      comment: 'Viewer request CloudFront function for intercepting requests',
      runtime: 'cloudfront-js-2.0', // Improved performance, lower latency, increased memory and size as well as support of more features (default: 'cloudfront-js-1.0')
      // Associate a maximum of 4 KVSs here
      keyValueStoreAssociations: props.cdn?.functionAssociations.viewerRequest.associateKeyValueStore?.map((kvs) => ({
        keyValueStoreArn: keyValueStores[kvs].keyValueStoreArn
      }))
    },
    autoPublish: true
  });

  functionAssociations.push({
    eventType: FunctionEventType.VIEWER_REQUEST,
    function: Function.fromFunctionAttributes(this, 'ViewerRequestCloudfrontFunctionAssociation', {
      functionArn: viewerRequestFunction.attrFunctionArn,
      functionName: `${props.stackNamePrefix}-viewer-request-function`
    })
  });
  */
};

export const getViewerResponseFunction = (scope: Stack, props: DeepRequiredExcept<NextjsProps, 'cdn.functionAssociations.viewerResponse'>, keyValueStores: Record<string, cdk.KeyValueStore>) => {
  const viewerResponseFunction = new cdk.Function(scope, 'ViewerResponseCloudfrontFunction', {
    functionName: `${props.stackNamePrefix}-viewer-response-function`,
    runtime: cdk.FunctionRuntime.JS_2_0, // Improved performance, lower latency, increased memory and size as well as support of more features (default: 'cloudfront-js-1.0')
    comment: 'Viewer response CloudFront function for intercepting requests',
    code: cdk.FunctionCode.fromFile({
      filePath: props.cdn.functionAssociations.viewerResponse.file
    }),
    keyValueStore: keyValueStores[props.cdn.functionAssociations.viewerResponse.associateKeyValueStore],
    autoPublish: true
  });

  return {
    eventType: cdk.FunctionEventType.VIEWER_RESPONSE,
    function: viewerResponseFunction
  };
};

export const getCloudfrontDistribution = (scope: Stack, resources: {
  functionUrlOrigin: FunctionUrlOrigin;
  staticAssetsBucketOrigin: S3StaticWebsiteOrigin;
  functionAssociations: cdk.FunctionAssociation[];
  siteOriginRequestPolicy: cdk.OriginRequestPolicy;
  sitePolicy: cdk.CachePolicy;
  wafStack?: WafStack;
}, props: NextjsProps) => {
  const {
    functionUrlOrigin,
    staticAssetsBucketOrigin,
    functionAssociations,
    siteOriginRequestPolicy,
    sitePolicy,
    wafStack
  } = resources;

  return new cdk.Distribution(scope, 'CloudFront', {
    comment: `CloudFront distribution for ${scope.stackName}`,
    certificate: props.cdn?.certificateArn ? Certificate.fromCertificateArn(scope, 'Certificate', props.cdn?.certificateArn) : undefined,
    domainNames: props.cdn?.domainNames,
    httpVersion: cdk.HttpVersion.HTTP2_AND_3,
    priceClass: cdk.PriceClass.PRICE_CLASS_100,
    webAclId: wafStack?.webAcl.attrArn,
    defaultBehavior: {
      origin: functionUrlOrigin,
      allowedMethods: cdk.AllowedMethods.ALLOW_ALL,
      functionAssociations: functionAssociations.length ? functionAssociations : undefined,
      viewerProtocolPolicy: cdk.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      originRequestPolicy: siteOriginRequestPolicy,
      cachePolicy: sitePolicy
    },
    additionalBehaviors: {
      '_next/data/*': {
        origin: functionUrlOrigin,
        allowedMethods: cdk.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cdk.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      '_next/*': {
        origin: staticAssetsBucketOrigin,
        allowedMethods: cdk.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cdk.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy: cdk.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: cdk.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS
        // cachePolicy: cdk.CachePolicy.CACHING_OPTIMIZED_FOR_UNCOMPRESSED_OBJECTS
      },
      'assets/*': {
        origin: staticAssetsBucketOrigin,
        allowedMethods: cdk.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cdk.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy: cdk.OriginRequestPolicy.CORS_S3_ORIGIN
        // cachePolicy: assetsCachePolicy
      }
    }
  });
};

/**
 * Separate stack for WAF that must be deployed in us-east-1
 */
export class WafStack extends Stack {
  public readonly webAcl: CfnWebACL;

  constructor (scope: Construct, id: string, props: NextjsProps, env?: { region?: string; account?: string }) {
    super(scope, id, {
      env: {
        region: 'us-east-1', // WAF for CloudFront must be in us-east-1
        account: env?.account // Use the same account as the main stack
      },
      crossRegionReferences: true
    });

    this.webAcl = new CfnWebACL(this, 'WebACL', {
      defaultAction: { allow: {} },
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${props.stackNamePrefix}-waf-metric`,
        sampledRequestsEnabled: true
      },
      rules: props.cdn?.waf?.rules.map((rule) => {
        return { ...rule, name: `${props.stackNamePrefix}-${rule.name}` };
      })
    });
  }
}
