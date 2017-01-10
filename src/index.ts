import 'reflect-metadata';
export * from './decorators/stress-test';
export * from './decorators/scenario-report';
export * from './decorators/scenario';
export * from './decorators/setup-report';
export * from './decorators/setup';
export * from './decorators/teardown-report';
export * from './decorators/teardown';
export * from './reports';
import * as jest from 'jest-cli';

jest.run([...process.argv.splice(2), '--forceExit']);
