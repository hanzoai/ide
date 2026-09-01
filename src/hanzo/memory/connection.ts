// Memory — connection state.
//
// In Hanzo AI, `isConnected()` tracked an out-of-process the engine server's
// liveness. Hanzo runs the engine in-process via Tauri, so the answer is
// always "yes, the backend is reachable" — failures surface as IPC errors at
// the call site, not as a top-level connection state.

/** Always true in Hanzo. The backend lives in the Tauri host process. */
export const isConnected = (): boolean => true;
