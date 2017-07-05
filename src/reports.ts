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
  _reports: Map<string, Report[]>;
  _step: string = EExecutionStep.INIT;

  constructor() {
    this._reports = new Map();
    this._reports.set(EExecutionStep.INIT, []);
    this._reports.set(EExecutionStep.SCENARIO, []);
    this._reports.set(EExecutionStep.SETUP, []);
    this._reports.set(EExecutionStep.TEARDOWN, []);
  }

  _setStep(executionStep: string) {
    this._step = executionStep;
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
}
