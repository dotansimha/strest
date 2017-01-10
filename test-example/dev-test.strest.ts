import {StressTest, waitTime, runInstances} from '../src/decorators/stress-test';
import {Setup, SetupUtils, StepResult} from '../src/decorators/setup';
import {Reports} from '../src/reports';
import {SetupReport} from '../src/decorators/setup-report';
import {Scenario} from '../src/decorators/scenario';
import {ScenarioReport} from '../src/decorators/scenario-report';
import {Teardown} from '../src/decorators/teardown';
import {MeteorStressTest} from '../src/tests-environments/meteor';
import {TeardownReport} from '../src/decorators/teardown-report';
import {addToTestSuite} from '../src/executer';

@StressTest({
  name: 'Connect and create simple subscription',
  instances: [runInstances(100), waitTime(20 * 1000), runInstances(200)]
})
export class LoginStressTest extends MeteorStressTest {
  @Setup
  createStress(utils: SetupUtils) {
    utils.startTime();

    return this.connect('http://localhost:3000')
               .then(() => this.login('admin', null, '123456'))
               .then(() => utils.stopTime())
               .then(() => this.ddp);
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

    expect(setupResult.executionTime).toBeLessThan(500);
  }

  @Scenario
  scenario(utils: SetupUtils, setupResult: StepResult) {
    utils.startTime();

    return this.subscribe('myData').then((result) => {
      utils.stopTime();

      return {
        handle: result
      };
    }).catch((e) => {
      utils.stopTime();

      return {
        error: e
      };
    });
  }

  @ScenarioReport
  scenarioReport(reporter: Reports, scenarioResult: StepResult) {
    reporter.report({
      name: 'meteorSubscription',
      description: 'Time spent to create a single subscription',
      data: {
        time: scenarioResult.executionTime
      }
    });

    // Make sure that the subscription is valid
    expect(scenarioResult.executionResult.error).toBeUndefined();
    expect(scenarioResult.executionResult.handle).toBeDefined();

    // Make sure that the subscription does not takes too much time
    expect(scenarioResult.executionTime).toBeLessThan(100);
  }

  @Teardown
  teardown(utils: SetupUtils, setupResult: StepResult, scenarioResult: StepResult) {
    utils.startTime();
    this.unsubscribe('myData');
    this.disconnect();
    utils.stopTime();
  }

  @TeardownReport
  teardownReport(reporter: Reports, setupResult: StepResult, scenarioResult: StepResult, teardownResult: StepResult) {
    reporter.report({
      name: 'meteorSubscription',
      description: 'Time spent to create a single subscription',
      data: {
        totalTestTime: setupResult.executionTime + scenarioResult.executionTime + teardownResult.executionTime
      }
    });
  }
}

addToTestSuite(LoginStressTest);
