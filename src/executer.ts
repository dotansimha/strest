import 'reflect-metadata';

import {Observable} from 'rxjs';
import {StressTestOptions, InstanceOption} from './decorators/stress-test';
import {Reports} from './reports';
import {SetupUtils, StepResult} from './decorators/setup';
import * as rawConsole from 'console';
import * as chalk from 'chalk';

const flowLog = (text: string, color = 'white') => {
  rawConsole.info(chalk[color].inverse(text));
};

const noop = () => {
};

declare const it;
declare const expect;

global['jasmine']['DEFAULT_TIMEOUT_INTERVAL'] = 1000 * 1000;

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
      if (!setupStartTime || !setupEndTime) {
        return 0;
      }

      return setupEndTime - setupStartTime;
    },
    instanceNumber: index
  };
};

type FlowInstance = {instance: any, setupAndScenario: Observable<any>, teardown: Function};

const buildFlowStream = (context: any, reports: Reports, testClass: any): (index: number) => FlowInstance => {
  return (index: number): FlowInstance => {
    const instance = new testClass(index, reports);
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
      setupAndScenario: // Setup
        observifyFromPromiseWithContext(methods.setup, context, setupData)
          .flatMap((result) => {
            const setupResult = <StepResult>{
              get executionTime() {
                return setupData.totalTime();
              },
              executionResult: result
            };

            teardownSetupResult = setupResult;

            // Setup Report
            return observifyFromPromiseWithContext(reportMethods.setup, context, reports, setupResult).map(() => setupResult);
          })
          .flatMap((setupResult) => {
            // Scenario
            return observifyFromPromiseWithContext(methods.scenario, context, scenarioData, setupResult);
          })
          .flatMap((res) => {
            const stepResult = <StepResult>{
              get executionTime() {
                return scenarioData.totalTime();
              },
              executionResult: res
            };

            teardownScenarioResult = stepResult;

            // Scenario Report
            return observifyFromPromiseWithContext(reportMethods.scenario, context, reports, stepResult).map(() => stepResult);
          }),
      teardown: () => {
        // Teardown
        return observifyFromPromiseWithContext(methods.teardown, context, teardownData, teardownSetupResult, teardownScenarioResult)
          .flatMap((result) => {
            const tdResult = <StepResult>{
              get executionTime() {
                return teardownData.totalTime();
              },
              executionResult: result
            };

            // Teardown Report
            return observifyFromPromiseWithContext(reportMethods.teardown, context, reports, teardownSetupResult, teardownScenarioResult, tdResult).map(() => tdResult);
          });
      }
    };
  };
};

const resolveExecutor = (singleLogic: Function, executor: InstanceOption, counter, teardownInstances: any[]): Observable<any> => {
  if (typeof executor === 'number') {
    executor = {
      totalCount: executor
    };
  }

  if (executor['totalCount']) {
    const times = executor['totalCount'];
    let obs = Observable.of(null);

    for (let i = 0; i < times; i++) {
      counter.count++;

      (function (index) {
        obs = obs.do(() => flowLog(`Executing instance #${index}...`, 'blue')).flatMap(() => {
          const instance = singleLogic(index);
          teardownInstances.push(instance.teardown);

          return instance.setupAndScenario;
        });
      })(counter.count);
    }

    return obs;
  }
  else if (executor['timeToWait']) {
    const time = executor['timeToWait'];

    return Observable.of(null).do(() => flowLog(`Waiting ${time}ms before next execution...`, 'grey')).delay(time);
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
    const repeatExecution = classConfig.repeat || 1;
    const instance = new testClass();
    const singleFlow = buildFlowStream(instance, reports, testClass);

    for (let i = 0; i < repeatExecution; i++) {
        
      it(`${testName} execution #${i}`, (done) => {
        const counter = {
          count: 0
        };
  
        const teardownInstances = [];
        let obsRes = Observable.of(null);
  
        executionOrder.forEach(executor => {
          obsRes = obsRes.flatMapTo(resolveExecutor(singleFlow, executor, counter, teardownInstances));
        });
  
        obsRes.do(() => flowLog(`Flow execution is done, running teardown methods...`, 'white')).subscribe(() => {
          Observable.merge(...teardownInstances.map(tearndownFn => tearndownFn())).subscribe(() => {
            setTimeout(done, 100);
          }, (e) => {
            throw e;
          });
        }, (err) => {
          console.log('err', err.stack);
          expect(err).not.toBeDefined();
        });
      });
    }
  });
};

export const addToTestSuite = execute;
