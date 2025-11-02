import type { NextjsStackProps } from '../types';

import { Duration, Stack } from 'aws-cdk-lib';

import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

import { Runtime, Architecture, FunctionUrlAuthType, InvokeMode, FunctionUrl, IFunction } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';

export const getServer = (scope: Stack, props: NextjsStackProps) => {
  return new NodejsFunction(scope, 'Server', {
    functionName: `${props.stackNamePrefix}-server`,
    entry: '.svelte-kit/sveltekit-aws-adapter/index.js',
    architecture: props.app.lambdaOptions?.architecture ?? Architecture.ARM_64,
    runtime: props.app.lambdaOptions?.runtime ?? Runtime.NODEJS_22_X,
    memorySize: props.app.lambdaOptions?.memorySize ?? 1024,
    timeout: props.app.lambdaOptions?.timeout ?? Duration.minutes(3),
    bundling: {
      ...props.app.lambdaOptions?.bundling,
      minify: true,
      format: OutputFormat.ESM,
      sourcesContent: false,
      sourceMap: true,
      sourceMapMode: SourceMapMode.INLINE,
      externalModules: ['@aws-sdk'],
      mainFields: ['module', 'main'],
      esbuildArgs: { '--conditions': 'module' }
    },
    environment: {
      NODE_OPTIONS: '--enable-source-maps'
    }
  });
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
