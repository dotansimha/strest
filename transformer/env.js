const fs = require('fs');
const path = require('path');
const vm = require('vm');
const mock = require('jest-mock');
const FakeTimers = require('jest-util').FakeTimers;
const installCommonGlobals = require('jest-util').installCommonGlobals;

const CONFIG_FILE_NAME = 'strest.json';
const DEFAULT_CONFIG = {
  reporters: [],
  reportDirectory: './reports/',
};

class StrestEnv {
  constructor(config) {
    this.context = vm.createContext();
    const global = (this.global = vm.runInContext('this', this.context));
    let strestConfig;

    try {
      const configFile = path.resolve(process.cwd(), CONFIG_FILE_NAME);
      console.log(`Looking for strest.json config file in: ${configFile}`);

      if (fs.existsSync(configFile)) {
        console.log(`Reading config from file: ${configFile}...`);
        strestConfig = Object.assign({}, DEFAULT_CONFIG, JSON.parse(fs.readFileSync(configFile).toString()));
      }
    } catch (e) {
      strestConfig = DEFAULT_CONFIG;

      console.log(e);
    }

    strestConfig.reportDirectory = path.resolve(process.cwd(), strestConfig.reportDirectory);


    global.global = global;
    global.clearInterval = clearInterval;
    global.clearTimeout = clearTimeout;
    global.Promise = Promise;
    global.setInterval = setInterval;
    global.setTimeout = setTimeout;
    global['$$configFile'] = strestConfig;
    global.global['$$configFile'] = strestConfig;

    installCommonGlobals(global, config.globals);
    this.moduleMocker = new mock.ModuleMocker(global);
    this.fakeTimers = new FakeTimers(global, this.moduleMocker, config);

  }

  dispose() {
    if (this.fakeTimers) {
      this.fakeTimers.dispose();
    }

    this.context = null;
    this.fakeTimers = null;
  }

  runScript(script) {
    if (this.context) {
      return script.runInContext(this.context);
    }

    return null;
  }
}

module.exports = StrestEnv;
