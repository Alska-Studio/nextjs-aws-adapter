import { CfnOutput, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { IDistribution } from 'aws-cdk-lib/aws-cloudfront';
import { BlockPublicAccess, Bucket, BucketAccessControl, HttpMethods, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';

export const createAssetsBucket = (scope: Stack) => {
  const assetsBucket = new Bucket(scope, 'StaticAssetsBucket', {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    websiteIndexDocument: 'index.html',
    publicReadAccess: true,
    objectOwnership: ObjectOwnership.OBJECT_WRITER,
    blockPublicAccess: new BlockPublicAccess({
      blockPublicAcls: false,
      blockPublicPolicy: false,
      ignorePublicAcls: false,
      restrictPublicBuckets: false
    }),
    cors: [
      {
        allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
        allowedOrigins: ['*']
      }
    ]
  });

  new CfnOutput(scope, 'staticAssetsBucketUrl', { value: assetsBucket.bucketDomainName });
  new CfnOutput(scope, 'staticAssetsBucketName', { value: assetsBucket.bucketName });

  return assetsBucket;
};

export interface UploadAssetsProps {
  assetsBucket: Bucket
  assetsPath: string
  cfnDistribution: IDistribution
}

export const addStaticAssets = (scope: Stack, { assetsBucket, assetsPath, cfnDistribution }: UploadAssetsProps) => {
  // This can be handled by `aws s3 sync` but we need to ensure invalidation of Cfn after deploy.
  new BucketDeployment(scope, 'StaticAssetsDeployment', {
    destinationBucket: assetsBucket,
    accessControl: BucketAccessControl.PUBLIC_READ,
    sources: [
      Source.asset(assetsPath)
    ],
    // Invalidate all paths after deployment.
    distribution: cfnDistribution,
    distributionPaths: ['/*']
  });
};
