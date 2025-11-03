import { fileURLToPath } from 'node:url';

import { BlockPublicAccess, Bucket, BucketAccessControl, HttpMethods, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { CacheControl } from 'aws-cdk-lib/aws-codepipeline-actions';
import { NextjsProps } from '../types';
import path from 'node:path';

export const getStaticAssetsBucket = (scope: Stack) => {
  return new Bucket(scope, 'StaticAssetsBucket', {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    websiteIndexDocument: 'index.html',
    publicReadAccess: true,
    objectOwnership: ObjectOwnership.OBJECT_WRITER,
    blockPublicAccess: new BlockPublicAccess({
      blockPublicAcls: false,
      blockPublicPolicy: false,
      ignorePublicAcls: false,
      restrictPublicBuckets: false,
    }),
    cors: [
      {
        allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
        allowedOrigins: ['*'],
      },
    ],
  });
};

export const addStaticAssetsBucketDeployment = (scope: Stack, staticAssetsBucket: Bucket, props: NextjsProps) => {
  return new BucketDeployment(scope, 'StaticAssetsBucketDeployment', {
    destinationBucket: staticAssetsBucket,
    accessControl: BucketAccessControl.PUBLIC_READ,
    sources: [
      Source.asset(path.join(props.app.entryDir, 'assetsLayer.zip')),
    ],
    cacheControl: [
      CacheControl.setPublic(),
      CacheControl.maxAge(Duration.days(2)),
      CacheControl.sMaxAge(Duration.days(2)),
      CacheControl.fromString('immutable'),
    ],
  });
};
