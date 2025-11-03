import type { IDistribution } from 'aws-cdk-lib/aws-cloudfront';
import type { NextjsProps } from '../types';

import { CfnOutput, Stack } from 'aws-cdk-lib';

export const addOutputs = (scope: Stack, id: string, resources: {
  cloudfront: IDistribution;
}, props: NextjsProps) => {
  const cloudfrontDomainNameOutput = new CfnOutput(scope, `${id}-cloudfront-domain-name`, {
    value: resources.cloudfront.distributionDomainName,
    description: 'CloudFront Distribution Domain Name',
    exportName: `${id}-cloudfront-domain-name`
  });

  const cloudfrontArnOutput = new CfnOutput(scope, `${id}-cloudfront-arn`, {
    value: resources.cloudfront.distributionArn,
    description: 'CloudFront Distribution ARN',
    exportName: `${id}-cloudfront-arn`
  });

  return {
    cloudfrontDomainNameOutput,
    cloudfrontArnOutput
  };
};
