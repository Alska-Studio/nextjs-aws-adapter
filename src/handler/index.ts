/* eslint-disable */
// ! This is needed for nextjs to correctly resolve.

import type { Options } from 'next/dist/server/next-server';
import type NextServerType from 'next/dist/server/next-server';

import { readFileSync } from 'node:fs';
import path from 'node:path'
import { ServerResponse } from 'node:http'
import slsHttp from 'serverless-http';

import warmer from 'lambda-warmer';

/* TODO: ESM support
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url);
*/

process.chdir(__dirname);
(process.env as any).NODE_ENV = 'production';

const { default: NextServer }: { default: typeof NextServerType } = require('next/dist/server/next-server');

// This will be loaded from custom config parsed via CLI.
const configFilePath = process.env.NEXT_CONFIG_FILE ?? './config.json';
const nextConf = JSON.parse(readFileSync(configFilePath, 'utf-8'));

const config: Options = {
  hostname: 'localhost',
  port: Number(process.env.PORT) || 3000,
  dir: path.join(__dirname),
  dev: false,
  customServer: false,
  conf: nextConf,
};

const getErrMessage = (e: any) => ({ message: 'Server failed to respond.', details: e });

const nextHandler = new NextServer(config).getRequestHandler();

type Handler = (event: Object, context: Object) => Promise<Object>;

const server = async (event: Object, context: Object) => {
  if (await warmer(event, {}, context)) {
    return 'warmed';
  }

  return await slsHttp(
    async (req: any, res: ServerResponse) => {
      try {
        return nextHandler(req, res);
      } catch (e: any) {
        console.error(e)
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(getErrMessage(e), null, 3));
      }
    }
  )(event, context)
};

export const handler = server as Handler;
