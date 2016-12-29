export interface Scenario {
  tests?: StressTest[];
  options?: ScenarioOptions;
}

export interface StressTest {
  name?: string;
  action?: Function;
}

export interface ScenarioOptions {
  swarmOf: number;
}

export interface ExecutionResult {
  result: any;
  executionTime: number
}
