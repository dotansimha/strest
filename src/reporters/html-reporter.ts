import * as filenamify from 'filenamify';
import * as path from 'path';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import { BaseReporter } from './base-reporter';
import { Reports } from '../reports';
import { logDebug } from '../log';

export class HtmlReporter implements BaseReporter {
  writeTestReport(testName: string, testDescription: string, reports: Reports, outPath: string) {
    const outDir = path.resolve(outPath, String(Date.now()));
    logDebug(`writeTestReport called using HtmlReporter after test: ${testName}...`);

    const safeFilename = filenamify(testName) + '.html';
    const newFilePath = path.resolve(outDir, safeFilename);
    mkdirp.sync(outDir);
    fs.writeFileSync(newFilePath, '');
  }
}
