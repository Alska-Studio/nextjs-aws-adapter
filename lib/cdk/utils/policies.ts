import { Stack } from 'aws-cdk-lib';
import { CacheCookieBehavior, CacheQueryStringBehavior, OriginRequestHeaderBehavior, OriginRequestPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { NextjsStackProps } from '../types';

export const getOriginRequestPolicy = (scope: Stack, props: Pick<NextjsStackProps, 'stackNamePrefix' | 'app'>) => {
  return new OriginRequestPolicy(scope, 'OriginRequestPolicy', {
    originRequestPolicyName: `${props.stackNamePrefix}-origin-request-policy`,
    comment: 'Origin request policy for the SvelteKit application',
    cookieBehavior: props.app.cookieAllowList?.length ? CacheCookieBehavior.allowList(...props.app.cookieAllowList) : CacheCookieBehavior.all(),
    headerBehavior: OriginRequestHeaderBehavior.denyList('host'),
    queryStringBehavior: CacheQueryStringBehavior.all()
  });
};
