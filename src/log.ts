import * as rawConsole from 'console';
import * as chalk from 'chalk';

export const DEBUG = !!process.env.DEBUG;

export const log = (text: string, color = 'white') => {
  rawConsole.info(chalk[color](text));
};

export const logDebug = (text: string, color = 'white') => {
  if (!DEBUG) {
    return;
  }

  rawConsole.info(chalk[color](text));
};

export const bgLog = (text: string, color = 'white') => {
  rawConsole.info(chalk[color].inverse(text));
};

