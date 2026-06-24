export type ShutdownCandidate = {
  readonly close?: () => Promise<void> | void;
  readonly flush?: () => Promise<void> | void;
  readonly shutdown?: () => Promise<void> | void;
  readonly stop?: () => Promise<void> | void;
};
