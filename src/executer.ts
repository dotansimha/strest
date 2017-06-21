import 'reflect-metadata';

import { Observable } from 'rxjs';
import { StressTestOptions, InstanceOption, ExecutionInstance } from './decorators/stress-test';
import { Reports } from './reports';
import { SetupUtils, StepResult } from './decorators/setup';
import * as rawConsole from 'console';
import * as chalk from 'chalk';
import { ExecutionErrors } from './exeution-error';

const DEBUG = !!process.env.DEBUG;

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

type FlowInstance = { instance: any, setupAndScenario: Observable<any>, teardown: Function };

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

const resolveExecutor = (singleLogic: Function, stopOnError: boolean, executor: InstanceOption, counter, teardownInstances: any[], parallel: boolean): Observable<any> => {
  if (typeof executor === 'number') {
    executor = {
      totalCount: executor
    };
  }

  if (executor['totalCount']) {
    const times = executor['totalCount'];
    let obs = Observable.of(null);
    const failedExecutions = [];

    const buildExec = ind => {
      const instance = singleLogic(ind);
      teardownInstances.push(instance.teardown);

      return Observable.of(ind).do(ind => log(`\t⌙ Executing instance #${ind + 1}...`, 'blue')).flatMap(() =>
        instance.setupAndScenario
          .catch((err) => {
            log('\t\t⌙ ' + String(err), 'red');

            if (stopOnError) {
              throw err;
            }

            failedExecutions.push({
              index: ind + 1,
              error: err
            });

            return Observable.of(null);
          }));
    };

    if (parallel) {
      counter.count = counter.count + times;
      obs = obs.flatMapTo(Observable.forkJoin(new Array(times).fill(null).map((dummy, ind) => buildExec(ind))));
    } else {
      for (let i = 0; i < times; i++) {
        counter.count++;
        obs = obs.flatMap(() => buildExec(i));
      }
    }

    return obs.do(() => {
      if (failedExecutions.length > 0) {
        throw new ExecutionErrors('Some of instances failed to execute!', failedExecutions);
      }
    });
  }
  else if (executor['timeToWait']) {
    const time = executor['timeToWait'];

    return Observable.of(null).do(() => log(`\t⌙Waiting ${time}ms before next execution...`, 'cyan')).delay(time);
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
    const parallel = classConfig.parallel;
    const repeatExecution = classConfig.repeat || 1;
    const singleFlow = buildFlowStream(reports, testClass);

    executionsOrder.forEach((executionOrderIns: ExecutionInstance) => {
      const executionOrder = executionOrderIns.getArr();
      const executionStr = executionOrderIns.asString();

      for (let i = 1; i <= repeatExecution; i++) {
        const title = `[ #${i} ][ ${executionStr} ] - ${testName}`;

        it(title, () => {
          return new Promise((resolve, reject) => {
            const counter = {
              count: 0
            };

            const teardownInstances = [];
            let obsRes = Observable.of(null).do(() => {
              bgLog(`${title} - EXEC (${parallel ? 'Parallel' : 'Serial'})...`, 'yellow');
            });

            executionOrder.forEach(executor => {
              obsRes = obsRes.flatMapTo(resolveExecutor(singleFlow, stopOnError, executor, counter, teardownInstances, parallel));
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
