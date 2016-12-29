import {scenarios} from './scenarios-manager';

export function StressTest() {
  return (target, key, descriptor) => {
    const testName = key;
    const scenarioName = target.constructor.name;

    if (!scenarios[scenarioName]) {
      scenarios[scenarioName] = {
        tests: []
      };
    }

    const scenario = scenarios[scenarioName];

    scenario.tests.push({
      name: testName,
      action: descriptor.value
    });

    return descriptor;
  };
}
