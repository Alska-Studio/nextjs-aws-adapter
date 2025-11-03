import type { NextjsProps } from '../types';

import { Stack } from 'aws-cdk-lib';

import {
  Duration,
} from 'aws-cdk-lib';

import {
  CachePolicy,
  CacheHeaderBehavior,
  CacheCookieBehavior,
  CacheQueryStringBehavior,
  OriginRequestPolicy,
  OriginRequestHeaderBehavior,
} from 'aws-cdk-lib/aws-cloudfront';

import * as iam from 'aws-cdk-lib/aws-iam';

export const getSitePolicy = (scope: Stack, props: NextjsProps) => {
  return new CachePolicy(scope, 'SiteCachePolicy', {
    cachePolicyName: `${props.stackNamePrefix}-site-cache-policy`,
    comment: `Cache policy for the ${props.stackNamePrefix} application`,
    defaultTtl: Duration.seconds(0),
    minTtl: Duration.seconds(0),
    maxTtl: Duration.days(365),
    headerBehavior: CacheHeaderBehavior.none(),
    cookieBehavior: CacheCookieBehavior.none(),
    queryStringBehavior: CacheQueryStringBehavior.all(),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true
  });
};

export const getServerPolicyStatement = () => {
  return new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'dynamodb:*'
    ],
    resources: ['*']
  });
};

export const getOriginRequestPolicy = (scope: Stack, props: NextjsProps) => {
  return new OriginRequestPolicy(scope, 'OriginRequestPolicy', {
    originRequestPolicyName: `${props.stackNamePrefix}-origin-request-policy`,
    comment: 'Origin request policy for the SvelteKit application',
    cookieBehavior: props.app.cookieAllowList?.length ? CacheCookieBehavior.allowList(...props.app.cookieAllowList) : CacheCookieBehavior.all(),
    headerBehavior: OriginRequestHeaderBehavior.denyList('host'),
    queryStringBehavior: CacheQueryStringBehavior.all()
  });
};
