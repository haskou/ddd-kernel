export class InvalidParseCronExpressionError extends Error {
  constructor(processName: string) {
    super(`Invalid cron expression for scheduler "${processName}".`);
    this.name = 'InvalidParseCronExpressionError';
  }
}
