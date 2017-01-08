import 'reflect-metadata';
import {LoginStressTest} from './dev-test';
import {Observable} from 'rxjs';
import {StressTestOptions, InstanceOption} from './decorators/stress-test';
import {Reports} from './reports';
import {SetupUtils} from './decorators/setup';

const noop = () => {
  console.log('noop');
};

jasmine['DEFAULT_TIMEOUT_INTERVAL'] = 5 * 1000;

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

const buildFlowStream = (context: any, reports: Reports, methods: MethodsBundle, reportMethods: MethodsBundle): (index: number) => Observable<any> => {
  return (index: number): Observable<any> => {
    return observifyFromPromiseWithContext(methods.setup, context, wrapWithExecution(index));
  };
};

const resolveExecutor = (baseObservable: Observable<any>, singleLogic: Function, executor: InstanceOption, counter): Observable<any> => {
  if (typeof executor === 'number') {
    executor = {
      totalCount: executor
    };
  }

  if (executor['totalCount']) {
    const times = executor['totalCount'];

    let obs = baseObservable.do(() => {
      console.log(`Adding ${times} executions to the flow...`);
    });

    for (let i = 0; i < times; i++) {
      counter.count++;

      obs = obs.flatMap(() => {
        return singleLogic(counter.count);
      });
    }

    return obs;
  }
  else if (executor['timeToWait']) {
    const time = executor['timeToWait'];

    return baseObservable.do(() => {
      console.log(`Waiting ${time}ms before next execution of instances`);
    }).delay(time);
  }
};

export const execute = (...classes: any[]) => {
  (classes || []).forEach((testClass) => {
    const classConfig: StressTestOptions = <StressTestOptions>testClass.$$config;

    if (!classConfig) {
      throw new Error(`Class ${testClass.name} is not decorated with @StressTest()!`);
    }

    const testName = classConfig.name || testClass.name;
    const executionOrder = classConfig.instances;
    const instance = new testClass();
    const setupFunction = instance.$$setup || noop;
    const setupReportFunction = instance.$$setupReport || noop;
    const scenarioFunction = instance.$$scenario || noop;
    const teardownFunction = instance.$$teardown || noop;
    const reports = new Reports();
    const singleFlow = buildFlowStream(instance, reports, {
      setup: setupFunction,
      scenario: scenarioFunction,
      teardown: teardownFunction
    }, {
      setup: setupReportFunction
    });

    it(testName, (done) => {
      let resultObs = Observable.of(null);

      const counter = {
        count: 0
      };

      executionOrder.forEach((executor) => {
        resultObs = resolveExecutor(resultObs, singleFlow, executor, counter);
      });

      resultObs
        .subscribe((res) => {
          console.log(`Done!`);
          done();
        }, (err) => {
          expect(err).not.toBeDefined();
        });
    });
  });
};

execute(LoginStressTest);
