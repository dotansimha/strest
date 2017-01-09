import 'reflect-metadata';

import {LoginStressTest} from './dev-test';
import {Observable} from 'rxjs';
import {StressTestOptions, InstanceOption} from './decorators/stress-test';
import {Reports} from './reports';
import {SetupUtils, StepResult} from './decorators/setup';

const noop = () => {
  console.log('noop');
};

jasmine['DEFAULT_TIMEOUT_INTERVAL'] = 20 * 1000;

const observifyFromPromiseWithContext = (func, context, ...args): Observable<any> => {
  return Observable.fromPromise(new Promise((resolve) => {
    resolve(func.apply(context, args));
  }));
};

const wrapWithExecution = (index: number) => {
  let setupStartTime, setupEndTime;

  return <SetupUtils>{
    startTime: () => {
      setupStartTime = Date.now();
    },
    stopTime: () => {
      setupEndTime = Date.now();
    },
    totalTime: () => {
      if (!setupStartTime) {
        throw new Error('Counter was never started!');
      }

      if (!setupEndTime) {
        throw new Error('Counter was never stopped!');
      }

      return setupEndTime - setupStartTime;
    },
    instanceNumber: index
  };
};

interface MethodsBundle {
  setup?: Function;
  scenario?: Function;
  teardown?: Function;
}

type FlowInstance = {instance: any, setupAndScenario: Observable<any>, teardown: Function};

const buildFlowStream = (context: any, reports: Reports, testClass: any): (index: number) => FlowInstance => {
  return (index: number): FlowInstance => {
    const instance = new testClass();
    const setupFunction = instance.$$setup || noop;
    const setupReportFunction = instance.$$setupReport || noop;
    const scenarioFunction = instance.$$scenario || noop;
    const scenarioReportFunction = instance.$$scenarioReport || noop;
    const teardownFunction = instance.$$teardown || noop;
    const teardownReportFunction = instance.$$teardownReport || noop;

    const methods = {
      setup: setupFunction,
      scenario: scenarioFunction,
      teardown: teardownFunction
    };

    const reportMethods = {
      setup: setupReportFunction,
      scenario: scenarioReportFunction,
      teardown: teardownReportFunction
    };

    const setupData = wrapWithExecution(index);
    const scenarioData = wrapWithExecution(index);
    const teardownData = wrapWithExecution(index);
    let teardownSetupResult, teardownScenarioResult;

    return {
      instance: instance,
      setupAndScenario:
        // Setup
        observifyFromPromiseWithContext(methods.setup, context, setupData)
        .flatMap((result) => {
          teardownSetupResult = result;

          const setupResult = <StepResult>{
            executionTime: setupData.totalTime(),
            executionResult: result
          };

          // Setup Report
          return observifyFromPromiseWithContext(reportMethods.setup, context, reports, setupResult).map(() => setupResult);
        })
        .flatMap((setupResult) => {
          // Scenario
          return observifyFromPromiseWithContext(methods.scenario, context, scenarioData, setupResult);
        })
        .flatMap((res) => {
          teardownScenarioResult = res;

          const stepResult = <StepResult>{
            executionTime: scenarioData.totalTime(),
            executionResult: res
          };

          // Scenario Report
          return observifyFromPromiseWithContext(reportMethods.scenario, context, reports, stepResult).map(() => stepResult);
        }),
      teardown: () => {
        // Teardown
        return observifyFromPromiseWithContext(methods.teardown, context, teardownData, teardownSetupResult, teardownScenarioResult)
          .flatMap((result) => {
            teardownSetupResult = result;

            const tdResult = <StepResult>{
              executionTime: setupData.totalTime(),
              executionResult: result
            };

            // Teardown Report
            return observifyFromPromiseWithContext(reportMethods.teardown, context, reports, teardownSetupResult, teardownScenarioResult, tdResult).map(() => tdResult);
          });
      }
    };
  };
};

const resolveExecutor = (baseObservable: Observable<any>, singleLogic: Function, executor: InstanceOption, counter, teardownInstances: any[]): Observable<any> => {
  if (typeof executor === 'number') {
    executor = {
      totalCount: executor
    };
  }

  if (executor['totalCount']) {
    const times = executor['totalCount'];

    let obs = baseObservable;

    for (let i = 0; i < times; i++) {
      counter.count++;

      obs = obs.flatMap(() => {
        const instance = singleLogic(counter.count);
        teardownInstances.push(instance.teardown);

        return instance.setupAndScenario;
      });
    }

    return obs;
  }
  else if (executor['timeToWait']) {
    const time = executor['timeToWait'];

    return baseObservable.delay(time);
  }
};

export const execute = (...classes: any[]) => {
  (classes || []).forEach((testClass) => {
    const classConfig: StressTestOptions = <StressTestOptions>testClass.$$config;

    if (!classConfig) {
      throw new Error(`Class ${testClass.name} is not decorated with @StressTest()!`);
    }

    const reports = new Reports();
    const testName = classConfig.name || testClass.name;
    const executionOrder = classConfig.instances;
    const instance = new testClass();
    const singleFlow = buildFlowStream(instance, reports, testClass);

    it(testName, (done) => {
      let resultObs = Observable.of(null);

      const counter = {
        count: 0
      };

      const teardownInstances = [];

      executionOrder.forEach((executor) => {
        resultObs = resolveExecutor(resultObs, singleFlow, executor, counter, teardownInstances);
      });

      resultObs
        .subscribe((res) => {
          console.log(`Flow execution is done, running teardown...`);
          console.log(teardownInstances.length);
          done();
        }, (err) => {
          throw err;
          //expect(err).not.toBeDefined();
        });
    });
  });
};

execute(LoginStressTest);
