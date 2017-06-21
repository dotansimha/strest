#!/usr/bin/env node

import * as jest from 'jest-cli';

const args = [...process.argv.splice(2), '--forceExit', '-i', '--verbose', '--runInBand'];

if (process.env.DEBUG) {
  console.log('Executing Jest with arguments: ', args);
}

jest.run(args);
