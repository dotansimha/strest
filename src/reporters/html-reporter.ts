import * as filenamify from 'filenamify';
import * as path from 'path';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import { BaseReporter } from './base-reporter';
import { Reports } from '../reports';

export class HtmlReporter implements BaseReporter {
  writeTestReport(testName: string, reports: Reports, outPath: string) {
    const safeFilename = filenamify(testName) + '.html';
    const newFilePath = path.resolve(outPath, safeFilename);
    mkdirp.sync(outPath);
    fs.writeFileSync(newFilePath, 'asdasdasd');
  }
}
