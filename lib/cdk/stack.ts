import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { App, Duration, Stack } from 'aws-cdk-lib';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IDistribution } from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Function, InvokeMode } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';

import { CustomStackProps, MappedDomain } from './types';
import { setupCfnCertificate } from './utils/cfnCertificate';
import { setupCloudfrontDistribution } from './utils/cfnDistro';
import { prepareDomains, setupDnsRecords } from './utils/dnsRecords';
import { createAssetsBucket, addStaticAssets } from './utils/s3';
import { setupServerLambda } from './utils/serverLambda';
import { addServerFunctionUrl, setServerLambdaWarmer } from './utils/server';

export class NextStandaloneStack extends Stack {
  imageLambda?: Function;
  serverLambda?: Function;
  apiGateway?: HttpApi;
  assetsBucket?: Bucket;
  cloudfrontDistribution?: IDistribution;
  cloudfrontCertificate?: ICertificate;
  domains: MappedDomain[] = [];

  constructor(scope: App, id: string, config: CustomStackProps) {
    super(scope, id, config);

    console.log('CDK\'s config:', config);

    this.assetsBucket = createAssetsBucket(this);

    this.serverLambda = setupServerLambda(this, {
      basePath: config.apigwServerPath,
      codePath: config.codeZipPath,
      handler: config.customServerHandler,
      dependenciesPath: config.dependenciesZipPath,
      timeout: config.lambdaTimeout,
      memory: config.lambdaMemory,
      runtime: config.lambdaRuntime
    });

    if (config.domainNames.length > 0) {
      this.domains = prepareDomains(this, {
        domains: config.domainNames,
        profile: config.awsProfile
      });

      console.log('Domains\'s config:', this.domains);
    }

    if (this.domains.length > 0) {
      this.cloudfrontCertificate = setupCfnCertificate(this, {
        domains: this.domains
      });
    }

    const functionUrl = addServerFunctionUrl(this, this.serverLambda);
    setServerLambdaWarmer(this, this.serverLambda, Duration.minutes(5));

    this.cloudfrontDistribution = setupCloudfrontDistribution(this, {
      assetsBucket: this.assetsBucket,
      functionUrl: functionUrl,
      domains: this.domains,
      certificate: this.cloudfrontCertificate,
      customApiOrigin: config.customApiDomain ? new HttpOrigin(config.customApiDomain) : undefined
    });

    addStaticAssets(this, {
      assetsBucket: this.assetsBucket,
      assetsPath: config.assetsZipPath,
      cfnDistribution: this.cloudfrontDistribution
    });

    if (this.domains.length > 0) {
      setupDnsRecords(this, {
        cfnDistro: this.cloudfrontDistribution,
        domains: this.domains
      });
    }
  }
}
