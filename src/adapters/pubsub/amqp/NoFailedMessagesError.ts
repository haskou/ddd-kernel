export class NoFailedMessagesError extends Error {
  constructor(queueName: string) {
    super(`No failed messages found in "${queueName}".`);
    this.name = 'NoFailedMessagesError';
  }
}
