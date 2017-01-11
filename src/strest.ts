#!/usr/bin/env node

import * as jest from 'jest-cli';

const args = [...process.argv.splice(2), '--forceExit', '-i'];

jest.run(args);