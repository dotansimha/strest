import 'reflect-metadata';

import {Observable} from 'rxjs';
import {StressTestOptions, InstanceOption, ExecutionInstance} from './decorators/stress-test';
import {Reports} from './reports';
import {SetupUtils, StepResult} from './decorators/setup';
import * as rawConsole from 'console';
import * as chalk from 'chalk';

const log = (text: string, color = 'white') => {
  rawConsole.info(chalk[color](text));
};

const bgLog = (text: string, color = 'white') => {
  rawConsole.info(chalk[color].inverse(text));
};

const underlineLog = (text: string, color = 'white') => {
  rawConsole.info(chalk[color].underline(text));
};

const underlineBgLog = (text: string, color = 'white') => {
  rawConsole.info(chalk[color].underline.inverse(text));
};

const noop = () => {
};

declare const it, expect, fail;

global['jasmine']['DEFAULT_TIMEOUT_INTERVAL'] = Math.pow(2, 31) - 1;

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

const buildFlowStream = (reports: Reports, testClass: any): (index: number) => FlowInstance => {
  return (index: number): FlowInstance => {
    const context = new testClass(index, reports);
    const setupFunction = context.$$setup || noop;
    const setupReportFunction = context.$$setupReport || noop;
    const scenarioFunction = context.$$scenario || noop;
    const scenarioReportFunction = context.$$scenarioReport || noop;
    const teardownFunction = context.$$teardown || noop;
    const teardownReportFunction = context.$$teardownReport || noop;

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
      instance: context,
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

const resolveExecutor = (singleLogic: Function, stopOnError: boolean, executor: InstanceOption, counter, teardownInstances: any[]): Observable<any> => {
  if (typeof executor === 'number') {
    executor = {
      totalCount: executor
    };
  }

  if (executor['totalCount']) {
    const times = executor['totalCount'];
    let obs = Observable.of(null);
    const failedExecutions = [];

    for (let i = 0; i < times; i++) {
      counter.count++;

      (function (ind) {
        obs = obs.do(() => log(`\tExecuting instance #${ind}...`, 'blue')).flatMap(() => {
          const instance = singleLogic(ind);
          teardownInstances.push(instance.teardown);

          return instance.setupAndScenario
            .catch((err) => {
              log('\t\t' + String(err), 'red');

              if (stopOnError) {
                throw err;
              }

              failedExecutions.push({
                index: ind,
                error: err
              });

              return Observable.of(null);
            });
        });
      })(counter.count);
    }

    return obs.do(() => {
      if (failedExecutions.length > 0) {
        throw new Error('Some of instances failed to execute: ' + failedExecutions.map(i => i.index).join(', '));
      }
    });
  }
  else if (executor['timeToWait']) {
    const time = executor['timeToWait'];

    return Observable.of(null).do(() => log(`\tWaiting ${time}ms before next execution...`, 'cyan')).delay(time);
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
    const executionsOrder = classConfig.instances;
    const stopOnError = classConfig.stopOnError;
    const repeatExecution = classConfig.repeat || 1;
    const singleFlow = buildFlowStream(reports, testClass);

    executionsOrder.forEach((executionOrderIns: ExecutionInstance) => {
      const executionOrder = executionOrderIns.getArr();
      const executionStr = executionOrderIns.asString();

      for (let i = 1; i <= repeatExecution; i++) {
        const title = `#${i} - ${testName} (${executionStr})`;

        it(title, () => {
          return new Promise((resolve, reject) => {
            const counter = {
              count: 0
            };

            const teardownInstances = [];
            let obsRes = Observable.of(null).do(() => { bgLog(`Executing repetition #${i}`, 'yellow'); });

            executionOrder.forEach(executor => {
              obsRes = obsRes.flatMapTo(resolveExecutor(singleFlow, stopOnError, executor, counter, teardownInstances));
            });

            obsRes
              .do(() => log(`Flow execution is done, running teardown methods...`, 'green'))
              .flatMap(() => {
                return Observable.merge(...teardownInstances.map(tearndownFn => tearndownFn()));
              })
              .subscribe(() => {
                setTimeout(resolve, 100);
              }, (e) => {
                setTimeout(() => {
                  reject(e);
                }, 100);
              });
          });
        });
      }
    });
  });
};

export const addToTestSuite = execute;
