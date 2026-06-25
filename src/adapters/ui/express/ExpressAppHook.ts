import type { HttpApp } from './HttpApp.js';

export type ExpressAppHook = (app: HttpApp) => Promise<void> | void;
