import { executeAsyncCmd } from '../utils';

interface Props {
  stackName: string
  appPath: string
  bootstrap: boolean
  region?: string
  profile?: string
  hotswap: boolean
}

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const cdkExecutable = require.resolve('aws-cdk/bin/cdk');

export const deployHandler = async ({
  stackName,
  appPath,
  bootstrap,
  region,
  hotswap,
  profile
}: Props) => {
  // All paths are absolute.
  const cdkBootstrapArgs = [`--app "node ${appPath}"`];
  const cdkDeployArgs = [`--app "node ${appPath}"`, '--require-approval never', '--ci'];

  if (hotswap) {
    cdkDeployArgs.push('--hotswap');
  }

  if (profile) {
    cdkDeployArgs.push(`--profile ${profile}`);
    cdkBootstrapArgs.push(`--profile ${profile}`);
  }

  const variables = {
    STACK_NAME: stackName,
    ...(region && { AWS_REGION: region })
  };

  if (bootstrap) {
    await executeAsyncCmd({
      cmd: `${cdkExecutable} bootstrap ${cdkBootstrapArgs.join(' ')}`,
      env: variables
    });
  }

  await executeAsyncCmd({
    cmd: `${cdkExecutable} deploy ${cdkDeployArgs.join(' ')}`,
    env: variables
  });
};
