export class ExecutionErrors extends Error {
  constructor(message: string, failExecutions: { error: Error, index: number }[]) {
    super(`
    ${message}
    
    Execution Errors: 
    
    ${failExecutions.map(e => `
    Instance #${e.index}
    
    ${e.error && e.error.stack ? e.error.stack.toString() : String(e.error)}
    `).join('\r\n')}`);
  }
}
