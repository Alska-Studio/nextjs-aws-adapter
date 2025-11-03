import type { NextjsProps } from '../types';

import path from 'node:path';

import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';

import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

import { Runtime, Architecture, FunctionUrlAuthType, InvokeMode, Function, FunctionUrl, IFunction, LayerVersion, Code } from 'aws-cdk-lib/aws-lambda';

export const getServer = (scope: Stack, props: NextjsProps) => {
  const depsLayer = new LayerVersion(scope, 'DepsLayer', {
    // This folder does not use Custom hash as depenendencies are most likely changing every time we deploy.
    code: Code.fromAsset(path.join(props.app.entryDir, 'dependenciesLayer.zip'))
  });

  // Note: To update the layer, run: ./build-layer.sh
  // The script will output the new Layer ARN that you can use below
  const sharpLayer = LayerVersion.fromLayerVersionArn(scope, 'SharpLayer', 'arn:aws:lambda:eu-north-1:266671103811:layer:next-lambda-layer:1');

  const serverLambda = new Function(scope, 'DefaultNextJs', {
    functionName: `${props.stackNamePrefix}-server`,
    architecture: props.app.lambdaOptions?.architecture ?? Architecture.ARM_64,
    runtime: props.app.lambdaOptions?.runtime ?? Runtime.NODEJS_20_X,
    memorySize: props.app.lambdaOptions?.memorySize ?? 1024,
    timeout: props.app.lambdaOptions?.timeout ?? Duration.minutes(3),
    code: Code.fromAsset(path.join(props.app.entryDir, 'code.zip')), // Node >= 22 will use .mjs (ESM)
    handler: 'index.handler',
    layers: [depsLayer, sharpLayer],
    environment: {
      // Set env vars based on what's available in environment.
      ...Object.entries(process.env)
        .filter(([key]) => key.startsWith('NEXT_'))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
      NODE_OPTIONS: '--enable-source-maps'
    }
  });

  new CfnOutput(scope, 'serverLambdaArn', { value: serverLambda.functionArn });

  return serverLambda;
};

export const setServerLambdaWarmer = (scope: Stack, lambdaFunction: IFunction, duration: Duration, concurrency = 1) => {
  const warmerRule = new events.Rule(scope, 'ServerWarmerRule', {
    schedule: events.Schedule.rate(duration)
  });

  warmerRule.addTarget(new targets.LambdaFunction(lambdaFunction, {
    event: events.RuleTargetInput.fromObject({ warmer: true, concurrency })
  }));
};

export const addServerFunctionUrl = (scope: Stack, lambdaFunction: IFunction, invokeMode: InvokeMode = InvokeMode.BUFFERED) => {
  return new FunctionUrl(scope, 'LambdaApiUrl', {
    function: lambdaFunction,
    authType: FunctionUrlAuthType.NONE,
    invokeMode: invokeMode,
    cors: {
      allowedOrigins: ['*'],
      allowedMethods: [events.HttpMethod.GET, events.HttpMethod.POST],
      allowCredentials: true,
      maxAge: Duration.minutes(1)
    }
  });
};
