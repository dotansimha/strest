import * as filenamify from 'filenamify';
import * as path from 'path';
import * as fs from 'fs';
import * as moment from 'moment';
import * as mkdirp from 'mkdirp';
import { compile } from 'handlebars';
import { BaseReporter } from './base-reporter';
import { Reports } from '../reports';
import { logDebug } from '../log';

const template = `
<html>
<head>
  <title>Stress Report for test {{ name }}</title>
</head>
<body>
  <div class="header">
    <h1>{{ description }} ({{ name }})</h1>
    <h2>{{ time }}</h2>
  </div>
  <div class="report">
      <h3>Setup Report</h3>
        
      <h3>Scenario Report</h3>
      <h3>Teardown Report</h3>
  </div>
</div>
</body>
</html>
`;

export class HtmlReporter implements BaseReporter {
  writeTestReport(testName: string, testDescription: string, reports: Reports, outPath: string) {
    logDebug(`writeTestReport called using HtmlReporter after test: ${testName}...`);

    const safeFilename = filenamify(testName) + '.html';
    const newFilePath = path.resolve(outPath, String(Date.now()), safeFilename);
    const compiledTemplate = compile(template);
    const templateWithData = compiledTemplate(this.prepareForTemplate(testName, testDescription, reports));

    this.write(newFilePath, templateWithData);
  }

  write(filePath: string, content: string) {
    mkdirp.sync(path.dirname(filePath));
    fs.writeFileSync(filePath, content);
  }

  prepareForTemplate(testName: string, testDescription: string, reports: Reports) {
    return {
      name: testName,
      description: testDescription,
      time: moment().format('LLL'),
    };
  }
}
