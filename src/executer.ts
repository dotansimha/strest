import 'reflect-metadata';

import { Observable } from 'rxjs';
import { StressTestOptions, InstanceOption, ExecutionInstance, StrestConfig } from './decorators/stress-test';
import { EExecutionStep, Reports } from './reports';
import { SetupUtils, StepResult } from './decorators/setup';
import * as path from 'path';
import { ExecutionErrors } from './exeution-error';
import { bgLog, log, logDebug } from './log';

const noop = () => {
};

declare const it, expect, fail, describe, test, afterAll, beforeEach, beforeAll, afterEach;

if (global && global['jasmine']) {
  global['jasmine']['DEFAULT_TIMEOUT_INTERVAL'] = Math.pow(2, 31) - 1;
}

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
    reports._setStep(EExecutionStep.INIT);
    reports._setInstanceNumber(index);
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
            logDebug(`\t\t⌙ DONE SETUP (${index + 1})`, 'blue');
            const setupResult = <StepResult>{
              get executionTime() {
                return setupData.totalTime();
              },
              executionResult: result
            };

            teardownSetupResult = setupResult;

            // Setup Report
            reports._setInstanceNumber(index);
            reports._setStep(EExecutionStep.SETUP);
            reports._setTest({
              result,
              instance: context,
            });
            return observifyFromPromiseWithContext(reportMethods.setup, context, reports, setupResult).map(() => setupResult);
          })
          .flatMap((setupResult) => {
            // Scenario
            return observifyFromPromiseWithContext(methods.scenario, context, scenarioData, setupResult);
          })
          .flatMap((res) => {
            logDebug(`\t\t⌙ DONE SCENARIO (${index + 1})`, 'blue');

            const stepResult = <StepResult>{
              get executionTime() {
                return scenarioData.totalTime();
              },
              executionResult: res
            };

            teardownScenarioResult = stepResult;

            // Scenario Report
            reports._setInstanceNumber(index);
            reports._setStep(EExecutionStep.SCENARIO);
            reports._setTest({
              result: res,
              instance: context,
            });
            return observifyFromPromiseWithContext(reportMethods.scenario, context, reports, stepResult).map(() => stepResult);
          }),
      teardown: () => {
        // Teardown
        return observifyFromPromiseWithContext(methods.teardown, context, teardownData, teardownSetupResult, teardownScenarioResult)
          .flatMap((result) => {
            logDebug(`\t\t⌙ DONE TEARDOWN (${index + 1})`, 'blue');

            const tdResult = <StepResult>{
              get executionTime() {
                return teardownData.totalTime();
              },
              executionResult: result
            };

            // Teardown Report
            reports._setInstanceNumber(index);
            reports._setStep(EExecutionStep.TEARDOWN);
            reports._setTest({
              result,
              instance: context,
            });
            return observifyFromPromiseWithContext(reportMethods.teardown, context, reports, teardownSetupResult, teardownScenarioResult, tdResult).map(() => tdResult);
          });
      }
    };
  };
};

const resolveExecutor = (singleLogic: Function, stopOnError: boolean, executor: InstanceOption, counter, teardownInstances: any[]): Observable<any> => {
  if (typeof executor === 'number') {
    executor = {
      parallel: false,
      totalCount: executor,
    };
  }

  if (executor['totalCount']) {
    const times = executor['totalCount'];
    const parallel = executor['parallel'] || false;
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

    return Observable.of(null).do(() => log(`\t⌙ Waiting ${time}ms before next execution...`, 'cyan')).delay(time);
  }
};

export const execute = (...classes: any[]) => {
  (classes || []).forEach((testClass) => {
    const classConfig: StressTestOptions = testClass.$$config as StressTestOptions;
    const strestConfig: StrestConfig = testClass.$$configFile as StrestConfig;

    if (!classConfig) {
      throw new Error(`Class ${testClass.name} is not decorated with @StressTest()!`);
    }

    const reports = new Reports();
    const testName = classConfig.name || testClass.name;
    const testDesc = classConfig.description || testClass.description;
    const executionsOrder = classConfig.instances;
    const stopOnError = classConfig.stopOnError;
    const repeatExecution = classConfig.repeat || 1;
    const singleFlow = buildFlowStream(reports, testClass);

    describe(`[${testDesc}]`, function () {
      executionsOrder.forEach((executionOrderIns: ExecutionInstance) => {
        const executionOrder = executionOrderIns.getArr();
        const executionStr = executionOrderIns.asString();

        for (let i = 1; i <= repeatExecution; i++) {
          const title = `[ #${i} ][ ${executionStr} ]`;

          it(title, function () {
            return new Promise((resolve, reject) => {
              const counter = {
                count: 0
              };

              const teardownInstances = [];
              let obsRes = Observable.of(null).do(() => {
                bgLog(`${title} - EXEC...`, 'yellow');
              });

              executionOrder.forEach(executor => {
                obsRes = obsRes.flatMapTo(resolveExecutor(singleFlow, stopOnError, executor, counter, teardownInstances));
              });

              obsRes
                .do(() => log(`\t⌙ Flow execution is done, running teardown methods...`, 'green'))
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

      afterAll(function () {
        logDebug('afterAll called: executing reporters...');

        try {
          reports.saveReport(reports, testName, testDesc, strestConfig.reporters, path.resolve(process.cwd(), strestConfig.reportDirectory));
        } catch (e) {
          logDebug(`afterAll error: ${e.toString()}`);
        }
      });
    });
  });
};

export const addToTestSuite = execute;
