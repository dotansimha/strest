import { BaseReporter } from './reporters/base-reporter';
import { HtmlReporter } from './reporters/html-reporter';

export const EReportType = {
  NOTE: 'NOTE',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
};

export const EExecutionStep = {
  INIT: 'INIT',
  SCENARIO: 'SCENARIO',
  SETUP: 'SETUP',
  TEARDOWN: 'TEARDOWN',
};

export interface Report {
  message: string;
  data?: any;
  timestamp?: Date;
  type?: string;
  instance?: number;
}

export class Reports {
  _instance: number;
  _currentTestData: any;
  _reports: Map<string, Report[]>;
  _reporters: Map<string, BaseReporter>;
  _step: string = EExecutionStep.INIT;

  constructor() {
    this._reports = new Map();
    this._reports.set(EExecutionStep.INIT, []);
    this._reports.set(EExecutionStep.SCENARIO, []);
    this._reports.set(EExecutionStep.SETUP, []);
    this._reports.set(EExecutionStep.TEARDOWN, []);

    this._reporters = new Map();
    this._reporters.set('html', new HtmlReporter());
  }

  _setStep(executionStep: string) {
    this._step = executionStep;
  }

  _setTest(testData: any) {
    this._currentTestData = testData;
  }

  _setInstanceNumber(instance: number) {
    this._instance = instance;
  }

  warning(params: Report) {
    params.type = EReportType.WARNING;
    this._report(params);
  }

  note(params: Report) {
    params.type = EReportType.NOTE;
    this._report(params);
  }

  error(params: Report) {
    params.type = EReportType.ERROR;
    this._report(params);
  }

  _report(params: Report) {
    params.timestamp = new Date();
    params.instance = this._instance;
    this._reports.get(this._step).push(params);
  }

  saveReport(reports: Reports, testName: string, reporters: string[], path: string) {
    if (reporters.length === 0 || !path) {
      return;
    }

    reporters.forEach((reporterName: string) => {
      const reporter = this._reporters.get(reporterName);

      if (reporter) {

      }
    });


  }
}
