import type { ExpressAppHook } from './ExpressAppHook.js';
import type { ExpressHookPhase } from './ExpressHookPhase.js';

export interface ExpressPhaseHook {
  readonly handle: ExpressAppHook;
  readonly phase: ExpressHookPhase;
}
