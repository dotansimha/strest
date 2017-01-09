import {StressTest, waitTime, runInstances} from './decorators/stress-test';
import {Setup, SetupUtils, StepResult} from './decorators/setup';
import {Reports} from './reports';
import {SetupReport} from './decorators/setup-report';
import {Scenario} from './decorators/scenario';
import {ScenarioReport} from './decorators/scenario-report';
import {Teardown} from './decorators/teardown';
import {MeteorStressTest} from './tests-environments/meteor';
import DDPStatic = DDP.DDPStatic;
import {TeardownReport} from './decorators/teardown-report';


@StressTest({
  name: 'Connect and run login',
  instances: [runInstances(1), waitTime(2000), runInstances(1)]
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

    expect(setupResult.executionTime).toBeLessThan(100);
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
    console.log("teardown");
  }

  @TeardownReport
  teardownReport(utils: SetupUtils, setupResult: StepResult, scenarioResult: StepResult, teardownResult: StepResult) {
    console.log("teardown report");
  }
}
