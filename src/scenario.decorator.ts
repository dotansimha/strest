import {scenarios} from './scenarios-manager';
import {ScenarioOptions} from './interfaces';

export function Scenario(options: ScenarioOptions) {
  return (target: any) => {
    const name = target.name;

    if (!scenarios[name]) {
      scenarios[name] = {
        tests: []
      };
    }

    const scenario = scenarios[name];
    scenario.options = options;

    return target;
  };
}
