export interface CronExpression {
  readonly dayOfMonth?: number | string;
  readonly dayOfWeek?: number | string;
  readonly hour?: number | string;
  readonly minute?: number | string;
  readonly month?: number | string;
  readonly second?: number | string;
}
