import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  BehaviorOptions,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CachePolicy,
  CachePolicyProps,
  CacheQueryStringBehavior,
  Distribution,
  HttpVersion,
  IOrigin,
  OriginRequestPolicy,
  PriceClass,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy
} from 'aws-cdk-lib/aws-cloudfront';

import { FunctionUrlOrigin, S3StaticWebsiteOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Bucket } from 'aws-cdk-lib/aws-s3';

import { MappedDomain } from '../types';
import { getOriginRequestPolicy } from './policies';
import { IFunctionUrl } from 'aws-cdk-lib/aws-lambda';

export interface CloudfrontDistributionProps {
  domains: MappedDomain[];
  certificate?: ICertificate;
  apiGateway?: HttpApi;
  assetsBucket: Bucket;
  functionUrl: IFunctionUrl;
  customApiOrigin?: IOrigin;
}

export const setupCloudfrontDistribution = (scope: Stack, props: CloudfrontDistributionProps) => {
  const { assetsBucket, domains, certificate, customApiOrigin, functionUrl } = props;
  // const apiGwDomainName = `${apiGateway.apiId}.execute-api.${scope.region}.amazonaws.com`;

  // const serverOrigin = new HttpOrigin(apiGwDomainName, { originPath: serverBasePath });
  // const imageOrigin = new HttpOrigin(apiGwDomainName, { originPath: imageBasePath });
  const assetsOrigin = new S3StaticWebsiteOrigin(assetsBucket);

  const defaultOptions: Partial<BehaviorOptions> = {
    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS
  };

  const defaultCacheOptions: Partial<CachePolicyProps> = {
    headerBehavior: CacheHeaderBehavior.none(), // CacheHeaderBehavior.allowList('accept', 'accept-language', 'content-language', 'content-type', 'user-agent', 'authorization'),
    queryStringBehavior: CacheQueryStringBehavior.all(),
    cookieBehavior: CacheCookieBehavior.none()
  };

  const imagesCachePolicy = new CachePolicy(scope, 'NextImageCachePolicy', {
    queryStringBehavior: CacheQueryStringBehavior.all(),
    enableAcceptEncodingGzip: true,
    defaultTtl: Duration.days(30)
  });

  const serverCachePolicy = new CachePolicy(scope, 'NextServerCachePolicy', {
    ...defaultCacheOptions
  });

  // Public folder persists names so we are making default TTL lower for cases when invalidation does not happen.
  const assetsCachePolicy = new CachePolicy(scope, 'NextPublicCachePolicy', {
    queryStringBehavior: CacheQueryStringBehavior.all(),
    enableAcceptEncodingGzip: true,
    defaultTtl: Duration.hours(12)
  });

  const serverOrigin = new FunctionUrlOrigin(functionUrl);

  // We don't use LambdaFunctionAssociation as that's meant only for Lambda@Edge.
  // Caching is optinionated to work out-of-the-box, for granular access and customization, create your own cache policies.
  const cfnDistro = new Distribution(scope, 'CfnDistro', {
    domainNames: domains.length > 0 ? domains.map((a) => a.domain) : undefined,
    certificate,
    comment: `CloudFront distribution for ${scope.stackName}`,
    httpVersion: HttpVersion.HTTP2_AND_3,
    priceClass: PriceClass.PRICE_CLASS_100,
    defaultBehavior: {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      originRequestPolicy: getOriginRequestPolicy(scope, { stackNamePrefix: scope.stackName, app: { entry: '', cookieAllowList: [] } }),
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachePolicy: serverCachePolicy,
      origin: serverOrigin
    },
    additionalBehaviors: {
      /*
      '/api*': {
        ...defaultOptions,
        origin: customApiOrigin ?? serverOrigin,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        cachePolicy: CachePolicy.CACHING_DISABLED
      },
      */
      '_next/data/*': {
        ...defaultOptions,
        origin: serverOrigin
      },
      /*
      '_next/image*': {
        ...defaultOptions,
        origin: imageOrigin,
        cachePolicy: imagesCachePolicy,
        compress: true
      },
      */
      '_next/*': {
        ...defaultOptions,
        origin: assetsOrigin,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
        // allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED_FOR_UNCOMPRESSED_OBJECTS,
        responseHeadersPolicy: ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS
      },
      'assets/*': {
        ...defaultOptions,
        origin: assetsOrigin,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
        cachePolicy: assetsCachePolicy
      }
    }
  });

  new CfnOutput(scope, 'cfnDistroUrl', { value: cfnDistro.distributionDomainName });
  new CfnOutput(scope, 'cfnDistroId', { value: cfnDistro.distributionId });

  return cfnDistro;
};
