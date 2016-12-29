import {scenarios} from './scenarios-manager';
import {ExecutionResult} from './interfaces';

const wrapMultiple = (method: Function, times: number): Promise<ExecutionResult>[] => {
  const promisesArr = [];

  for (let i = 0; i < times; i++) {
    promisesArr.push(new Promise((resolve, reject) => {
      const start = Date.now();
      let execResult = null;

      try {
        execResult = method();
      }
      catch (e) {
        reject(e);
        return;
      }

      return resolve(Promise.resolve(execResult).then(result => {
        const executionTime: number = Date.now() - start;

        return {
          result: result,
          executionTime: executionTime
        };
      }));
    }));
  }

  return promisesArr;
};

export class Strest {
  static run() {
    Object.keys(scenarios).forEach((scenarioName: string) => {
      const scenarioDefinition = scenarios[scenarioName];
      console.log(`========== ${scenarioName} ==========`);

      scenarioDefinition.tests.forEach((test) => {
        console.log(`\t- ${test.name} - running method ${scenarioDefinition.options.swarmOf} times...`);
        const promises = wrapMultiple(test.action, scenarioDefinition.options.swarmOf);

        Promise.all(promises).then((results: ExecutionResult[]) => {
          results.forEach((result: ExecutionResult) => {
            console.log(`\t\tDone in ${result.executionTime}ms`);
          });
        });
      });
    });
  }
}
