/**
 * Background jobs scheduler. Jobs are registered in later phases
 * (offer-sweeper, order-timeouts, stale-drivers, stuck-order sweep).
 */
import { runOrderTimeouts } from './order-timeouts';
import { runDispatchSweeper } from '../modules/dispatch/dispatch.controller';

export function startJobs(): void {
  // Run order timeout checks every 30 seconds
  setInterval(() => void runOrderTimeouts(), 30_000);
  // Run dispatch sweeper every 15 seconds (expire offers + advance dispatch)
  setInterval(() => void runDispatchSweeper(), 15_000);
}
