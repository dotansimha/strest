export type TimeInterval = {
  timeToWait: number;
};

export const waitTime = (timeInMs: number): TimeInterval => {
  return {
    timeToWait: timeInMs
  };
};

export type Execution = {
  totalCount: number;
};

export const runInstances = (count: number): Execution => {
  return {
    totalCount: count
  };
};

export type InstanceOption = number | TimeInterval | Execution;

export interface StressTestOptions {
  name?: string;
  instances: InstanceOption[];
}

export const StressTest = (options: StressTestOptions = {instances: [1]}) => {
  return (target: any) => {
    target.$$config = options;
  };
};
