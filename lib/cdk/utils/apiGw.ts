import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

export interface SetupApiGwProps {
  imageLambda?: IFunction
  serverLambda: IFunction
  imageBasePath: string
  serverBasePath: string
}

export const setupApiGateway = (scope: Stack, { imageLambda, imageBasePath, serverLambda, serverBasePath }: SetupApiGwProps) => {
  const apiGateway = new HttpApi(scope, 'ServerProxy');

  // We could do parameter mapping here and remove prefix from path.
  // However passing env var (basePath) is easier to use, understand and integrate to other solutions.
  apiGateway.addRoutes({
    path: `${serverBasePath}/{proxy+}`,
    integration: new HttpLambdaIntegration('LambdaApigwIntegration', serverLambda)
  });
  new CfnOutput(scope, 'apiGwUrlServerUrl', { value: `${apiGateway.apiEndpoint}${serverBasePath}` });

  if (imageLambda) {
    apiGateway.addRoutes({ path: `${imageBasePath}/{proxy+}`, integration: new HttpLambdaIntegration('ImagesApigwIntegration', imageLambda) });
    new CfnOutput(scope, 'apiGwUrlImageUrl', { value: `${apiGateway.apiEndpoint}${imageBasePath}` });
  }

  return apiGateway;
};
