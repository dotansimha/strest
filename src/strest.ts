#!/usr/bin/env node

import * as path from 'path';
import * as jest from 'jest-cli';

const args = [...process.argv.splice(2), '-i', '--verbose', '--runInBand', '--env=' + path.resolve(__dirname, '../transformer/env.js')];

if (process.env.DEBUG) {
  console.log('Executing Jest with arguments: ', args);
}

jest.run(args);
