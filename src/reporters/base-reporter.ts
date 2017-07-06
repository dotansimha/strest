import { Reports } from '../reports';

export interface BaseReporter {
  writeTestReport(testName: string, testDescription: string, reports: Reports, path: string);
}
