import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { globSync } from 'glob';

import { colors as Colors } from '@agapi-development-tools/common-utilities';
import { findObjectInFile, findPathToNestedFile, validateFolderExists, validatePublicFolderStructure, zipMultipleFoldersOrFiles } from '../utils';

interface Props {
  standaloneFolder: string
  publicFolder: string
  handlerPath: string
  outputFolder: string
  commandCwd: string
}

const NEXT_SERVER_CONFIG_REGEX = /(?<=conf: )(.*)(?=,)/;
const NEXT_SERVER_CONFIG_REGEX13_3 = /(?<=nextConfig = )(.*)/;

const NODE_MODULES_FOLDER = 'node_modules';
const DEPENDENCIES_LAMBDA_FOLDER = 'nodejs/node_modules';
const NEXT_SERVER_FILE = 'server.js';
const PACKAGE_JSON_FILE = 'package.json';
const DEPENDENCIES_ZIP_FILE = 'dependenciesLayer.zip';
const ASSETS_ZIP_FILE = 'assetsLayer.zip';
const CODE_ZIP_FILE = 'code.zip';
const TMP_FOLDER = os.tmpdir();

const copy = (source: string, target: string) => {
  if (fs.lstatSync(source).isSymbolicLink()) {
    const targetLinkSource = fs.readlinkSync(source);
    const targetLinkIndex = targetLinkSource.split('/').findIndex((p) => p === 'node_modules');
    const targetLink = targetLinkSource.split('/').slice(targetLinkIndex + 1).join('/');

    fs.symlinkSync(targetLink, target);
  } else if (fs.statSync(source).isDirectory()) {
    fs.cpSync(source, target, { recursive: true, verbatimSymlinks: true }); // Use verbatimSymlinks to preserve the symlink
  }
};

const buildDependenciesLayer = async (output: string, input: string) => {
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });

  for (const nmd of globSync('**/node_modules', { cwd: input, absolute: true, ignore: ['**/node_modules/**/node_modules'] })) {
    for (const source of globSync('*', { cwd: nmd, absolute: true, dot: true, dotRelative: true })) {
      if (fs.statSync(source).isDirectory()) {
        const target = path.join(output, path.basename(source));
        copy(source, target);
      }
    }
  }
};

export const packHandler = async ({ handlerPath, outputFolder, publicFolder, standaloneFolder, commandCwd }: Props) => {
  const startTime = Date.now();

  validatePublicFolderStructure(publicFolder);
  validateFolderExists(standaloneFolder);

  const pathToNextOutput = findPathToNestedFile(NEXT_SERVER_FILE, standaloneFolder);

  // Dependencies layer configuration
  const dependenciesOutputPath = path.resolve(outputFolder, DEPENDENCIES_ZIP_FILE);
  const nestedDependenciesOutputPath = dependenciesOutputPath.includes(pathToNextOutput) ? null : path.resolve(pathToNextOutput, NODE_MODULES_FOLDER);

  // Assets bundle configuration
  const buildIdPath = path.resolve(commandCwd, './.next/BUILD_ID');
  const generatedStaticContentPath = path.resolve(commandCwd, '.next/static');
  const generatedStaticRemapping = '_next/static';
  const assetsOutputPath = path.resolve(outputFolder, ASSETS_ZIP_FILE);

  // Code layer configuration
  const generatedNextServerPath = path.resolve(pathToNextOutput, NEXT_SERVER_FILE);
  const packageJsonPath = path.resolve(standaloneFolder, PACKAGE_JSON_FILE);
  const codeOutputPath = path.resolve(outputFolder, CODE_ZIP_FILE);

  // Display packing information
  console.log(Colors.styledText()`
NextJS-AWS-Adapter: 📦 Packing...
‣ Configuration:
  <softGreen>•</softGreen> <summerSky>public folder:</summerSky> <darkGrey>${path.relative(commandCwd, publicFolder)}</darkGrey>
  <softGreen>•</softGreen> <summerSky>standalone folder:</summerSky> <darkGrey>${path.relative(commandCwd, standaloneFolder)}</darkGrey>
  <softGreen>•</softGreen> <summerSky>handler path:</summerSky> <darkGrey>${path.relative(commandCwd, handlerPath)}</darkGrey>
  <softGreen>•</softGreen> <summerSky>output folder:</summerSky> <darkGrey>${path.relative(commandCwd, outputFolder)}</darkGrey>

‣ Generated ZIP files:
  <softGreen>→</softGreen> <darkGrey>${path.relative(commandCwd, dependenciesOutputPath)}</darkGrey>
  <softGreen>→</softGreen> <darkGrey>${path.relative(commandCwd, assetsOutputPath)}</darkGrey>
  <softGreen>→</softGreen> <darkGrey>${path.relative(commandCwd, codeOutputPath)}</darkGrey>`);

  // Clean output directory before continuing
  fs.rmSync(outputFolder, { force: true, recursive: true });
  fs.mkdirSync(outputFolder);

  const dependencyOutputPath = path.join(TMP_FOLDER, 'nextjs-lambda', NODE_MODULES_FOLDER);
  await buildDependenciesLayer(dependencyOutputPath, standaloneFolder);

  // Zip dependencies from standalone output in a layer-compatible format.
  // In case monorepo is used, include nested node_modules folder which might include additional dependencies.
  await zipMultipleFoldersOrFiles({
    outputName: dependenciesOutputPath,
    inputDefinition: [
      {
        path: dependencyOutputPath,
        dir: DEPENDENCIES_LAMBDA_FOLDER
      },
      ...(nestedDependenciesOutputPath
        ? [
          {
            path: nestedDependenciesOutputPath,
            dir: DEPENDENCIES_LAMBDA_FOLDER
          }
        ]
        : [])
    ]
  });

  // Zip staticly generated assets and public folder.
  await zipMultipleFoldersOrFiles({
    outputName: assetsOutputPath,
    inputDefinition: [
      {
        isFile: true,
        name: 'BUILD_ID',
        path: buildIdPath
      },
      {
        path: publicFolder
      },
      {
        path: generatedStaticContentPath,
        dir: generatedStaticRemapping
      }
    ]
  });

  const nextConfig = findObjectInFile(generatedNextServerPath, [NEXT_SERVER_CONFIG_REGEX13_3, NEXT_SERVER_CONFIG_REGEX]);
  const configPath = path.resolve(TMP_FOLDER, `./config.json_${Math.random()}`);
  fs.writeFileSync(configPath, nextConfig, 'utf-8');

  // Zip codebase including handler.
  await zipMultipleFoldersOrFiles({
    outputName: codeOutputPath,
    inputDefinition: [
      {
        isFile: true,
        path: packageJsonPath,
        name: 'package.json'
      },
      {
        isGlob: true,
        dot: true,
        cwd: pathToNextOutput,
        path: '**/*',
        ignore: ['**/node_modules/**', '*.zip', '**/package.json']
      },
      {
        isFile: true,
        path: handlerPath,
        name: 'index.js'
      },
      {
        isFile: true,
        path: configPath,
        name: 'config.json'
      }
    ]
  });

  const endTime = Date.now();
  console.log(Colors.styledText()`\n<softGreen>✓</softGreen> Build success in ${endTime - startTime}ms`);
};
