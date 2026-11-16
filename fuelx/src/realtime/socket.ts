import type { Server as HttpServer } from 'node:http';

/**
 * Attaches the Socket.IO server. Fully wired in Phase 7 (realtime + tracking).
 * Kept as a stable entry point so server.ts does not change between phases.
 */
export function attachRealtime(_server: HttpServer): void {
  // Implemented in Phase 7.
}
