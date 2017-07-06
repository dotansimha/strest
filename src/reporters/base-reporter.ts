import { Reports } from '../reports';

export interface BaseReporter {
  writeTestReport(testName: string, reports: Reports, path: string);
}
