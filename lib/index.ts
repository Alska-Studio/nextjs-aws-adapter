import { setupApiGateway, SetupApiGwProps } from './cdk/utils/apiGw';
import { setupCfnCertificate, SetupCfnCertificateProps } from './cdk/utils/cfnCertificate';
import { setupCloudfrontDistribution, CloudfrontDistributionProps } from './cdk/utils/cfnDistro';
import { PrepareDomainProps, prepareDomains, setupDnsRecords, SetupDnsRecordsProps } from './cdk/utils/dnsRecords';
import { setupImageLambda, SetupImageLambdaProps } from './cdk/utils/imageLambda';
import { createAssetsBucket, addStaticAssets, UploadAssetsProps } from './cdk/utils/s3';
import { setupServerLambda, SetupServerLambdaProps } from './cdk/utils/serverLambda';

export { NextStandaloneStack } from './cdk/stack';
export type { CustomStackProps } from './cdk/types';
export { handler as serverHandler } from './server-handler';

export const CdkUtils = {
	setupApiGateway,
	createAssetsBucket,
	setupCfnCertificate,
	setupCloudfrontDistribution,
	setupDnsRecords,
	setupImageLambda,
	setupServerLambda,
	addStaticAssets,
	prepareDomains
};

export type {
	PrepareDomainProps,
	SetupApiGwProps,
	SetupCfnCertificateProps,
	CloudfrontDistributionProps,
	SetupDnsRecordsProps,
	SetupImageLambdaProps,
	SetupServerLambdaProps,
	UploadAssetsProps
};
