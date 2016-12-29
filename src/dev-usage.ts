import {Scenario} from './scenario.decorator';
import {StressTest} from './stress-test.decorator';
import {Strest} from './strest';

@Scenario({
  swarmOf: 2
})
export class Scenario1 {
  constructor() {

  }

  @StressTest()
  testMainPage() {
    console.log('run');
  }
}

Strest.run();
