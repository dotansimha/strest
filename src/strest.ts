#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as jest from 'jest-cli';
import { DEFAULT_CONFIG } from './decorators/stress-test';

const CONFIG_FILE_NAME = 'strest.json';

try {
  const configFile = path.resolve(process.cwd(), CONFIG_FILE_NAME);
  console.log(`Looking for strest.json config file in: ${configFile}`);

  if (fs.existsSync(configFile)) {
    console.log(`Reading config from fiel: ${configFile}...`);
    global['$$configFile'] = Object.assign({}, DEFAULT_CONFIG, JSON.parse(fs.readFileSync(configFile).toString()));
  }
} catch (e) {
  global['$$configFile'] = DEFAULT_CONFIG;

  console.log(e);
}

const args = [...process.argv.splice(2), '--forceExit', '-i', '--verbose', '--runInBand'];

if (process.env.DEBUG) {
  console.log('Config file: ', global['$$configFile']);
  console.log('Executing Jest with arguments: ', args);
}

jest.run(args);
