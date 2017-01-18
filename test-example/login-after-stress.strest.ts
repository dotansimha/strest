import {
  MeteorStressTest,
  Teardown,
  ScenarioReport,
  Scenario,
  SetupReport,
  Reports,
  StressTest,
  waitTime,
  runInstances,
  Setup,
  SetupUtils,
  StepResult
} from '../src/index';

@StressTest({
  name: 'Connect and create simple subscription',
  instances: [runInstances(1)]
})
export class LoginStressTest extends MeteorStressTest {
  constructor(private instanceNumber: number) {
    super();

  }

  @Setup
  createStress(utils: SetupUtils) {
    utils.startTime();

    console.log("ins", this.instanceNumber);
    return super.connect('http://gefen-dev:3000/')
      .then(utils.stopTime);
  }

  @SetupReport
  setupReport(reporter: Reports, setupResult: StepResult) {
    expect(setupResult.executionTime).toBeLessThan(2000);
  }

  @Scenario
  scenario(utils: SetupUtils, setupResult: StepResult) {
    // utils.startTime();
    //
    // return super.login('ameline', null, '12345678*')
    //   .then(o => {
    //     console.log(o);
    //     utils.stopTime();
    //   })
    //   .catch(e => {
    //     console.log(e);
    //   })
  }

  @ScenarioReport
  scenarioReport(reporter: Reports, scenarioResult: StepResult) {
    //if (this.instanceNumber === )
    expect(scenarioResult.executionTime).toBeLessThan(500);
  }

  @Teardown
  teardown(utils: SetupUtils, setupResult: StepResult, scenarioResult: StepResult) {
    utils.startTime();
    this.disconnect();
    utils.stopTime();
  }
}
