import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import { Architecture, Code, Function, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';

export interface SetupServerLambdaProps {
  codePath: string
  dependenciesPath: string
  handler: string
  basePath: string
  memory: number
  timeout: number
  runtime: Runtime
}

export const DEFAULT_MEMORY = 1024;
export const DEFAULT_TIMEOUT = 20;
export const DEFAULT_RUNTIME = Runtime.NODEJS_22_X;

export const setupServerLambda = (
  scope: Stack,
  { basePath, codePath, dependenciesPath, handler, memory = DEFAULT_MEMORY, timeout = DEFAULT_TIMEOUT, runtime = DEFAULT_RUNTIME }: SetupServerLambdaProps
) => {
  const depsLayer = new LayerVersion(scope, 'DepsLayer', {
    // This folder does not use Custom hash as depenendencies are most likely changing every time we deploy.
    code: Code.fromAsset(dependenciesPath)
  });

  // Note: To update the layer, run: ./build-layer.sh
  // The script will output the new Layer ARN that you can use below
  const sharpLayer = LayerVersion.fromLayerVersionArn(scope, 'SharpLayer', 'arn:aws:lambda:eu-north-1:266671103811:layer:next-lambda-layer:1');

  const serverLambda = new Function(scope, 'DefaultNextJs', {
    code: Code.fromAsset(codePath),
    runtime,
    handler,
    architecture: Architecture.ARM_64,
    layers: [depsLayer, sharpLayer],
    // No need for big memory as image handling is done elsewhere.
    memorySize: 1024, // 3008,
    timeout: Duration.seconds(30),
    environment: {
      // Set env vars based on what's available in environment.
      ...Object.entries(process.env)
        .filter(([key]) => key.startsWith('NEXT_'))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
      NEXTJS_LAMBDA_BASE_PATH: basePath
    }
  });

  new CfnOutput(scope, 'serverLambdaArn', { value: serverLambda.functionArn });

  return serverLambda;
};
