import { addToTestSuite } from '../executer';

export interface StrestConfig {
  reporters: string[];
  reportDirectory: string;
}

export const DEFAULT_CONFIG: StrestConfig = {
  reporters: [],
  reportDirectory: './reports/',
};

export type TimeInterval = {
  timeToWait: number;
};

export type Execution = {
  totalCount: number;
  parallel: boolean;
};

const waitTimeInner = (timeInMs: number): TimeInterval => {
  return {
    timeToWait: timeInMs
  };
};

const runInstancesInner = (count: number, parallel = false): Execution => {
  return {
    parallel,
    totalCount: count
  };
};

export class ExecutionInstance {
  arr: any[];

  constructor() {
    this.arr = [];
  }

  getArr() {
    return this.arr;
  }

  asString() {
    const actionsArr = [];

    this.arr.forEach((item: any) => {
      if (item.totalCount) {
        actionsArr.push(`I(${item.totalCount})`);
      }
      else if (item.timeToWait) {
        actionsArr.push(`W(${item.timeToWait}ms)`);
      }
    });

    return actionsArr.join(', ');
  }

  public waitTime(time: number) {
    this.arr.push(waitTimeInner(time));

    return this;
  }

  public runInstances(count: number, parallel = false) {
    this.arr.push(runInstancesInner(count, parallel));

    return this;
  }
}

export const waitTime = (time: number) => {
  const ins = new ExecutionInstance();

  return ins.waitTime(time);
};

export const runInstances = (count: number, parallel = false) => {
  const ins = new ExecutionInstance();

  return ins.runInstances(count, parallel);
};

export type InstanceOption = TimeInterval | Execution;

export interface StressTestOptions {
  name?: string;
  instances: ExecutionInstance[];
  repeat?: number;
  stopOnError?: boolean;
}

export const StressTest = (options: StressTestOptions = { instances: [runInstances(1)] }) => {
  return (target: any) => {
    target.$$config = options;
    target.$$configFile = global['$$configFile'];

    addToTestSuite(target);
  };
};
