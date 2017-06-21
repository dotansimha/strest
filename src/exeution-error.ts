export class ExecutionErrors extends Error {
  constructor(message: string, failExecutions: { error: Error, index: number }[]) {
    super(`
    ${message}
    
    Execution Errors: 
    
    ${failExecutions.map(e => `
    Instance #${e.index}
    
    ${e.error.stack.toString()}
    `).join('\r\n')}`);
  }
}
