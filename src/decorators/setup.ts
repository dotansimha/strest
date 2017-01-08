export interface StepResult {
  executionTime: number;
  executionResult: number;
}

export interface SetupUtils {
  startTime: () => void;
  stopTime: () => void;
  totalTime: () => number;
  instanceNumber: number;
}

export const Setup = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  target.$$setup = target[propertyKey];
};
