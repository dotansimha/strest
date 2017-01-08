import {StressTest, waitTime, runInstances} from './decorators/stress-test';
import {Setup, SetupUtils, StepResult} from './decorators/setup';
import {Reports} from './reports';
import {SetupReport} from './decorators/setup-report';
import {Scenario} from './decorators/scenario';
import {ScenarioReport} from './decorators/scenario-report';
import {Teardown} from './decorators/teardown';
import {MeteorStressTest} from './tests-environments/meteor';

@StressTest({
  name: 'Connect and run login',
  instances: [runInstances(1), waitTime(2000), runInstances(2)]
})
export class LoginStressTest extends MeteorStressTest {
  @Setup
  createStress(utils: SetupUtils) {
    utils.startTime();

    return this.connect('http://localhost:3000').then(() => {
      utils.stopTime();

      return this.ddp;
    });
  }

  @SetupReport
  setupReport(reporter: Reports, setupResult: StepResult) {
    reporter.report({
      name: 'ddpConnection',
      description: 'Time spent to create a single DDP connection on setup',
      data: {
        time: setupResult.executionTime
      }
    });
  }

  @Scenario
  scenario(utils: SetupUtils, setupResult: StepResult) {

  }

  @ScenarioReport
  scenarioReport(reporter: Reports, setupResult: StepResult) {
    console.log("report result");
    reporter.report({
      name: 'login',
      description: 'Time spent to create a single DDP connection on setup',
      data: {
        time: setupResult.executionTime
      }
    });

    //expect(setupResult.executionTime).toBeLowerThan(2000);
  }

  @Teardown
  teardown(utils: SetupUtils, setupResult: StepResult) {

  }
}
