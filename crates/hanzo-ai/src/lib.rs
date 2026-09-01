// ── Hanzo AI ────────────────────────────────────────────────────────────────
//
// Hanzo AI crate — AST indexing, code intelligence, and sandbox execution.
//
// Depends on:
//   - hanzo-shell (for ide_mcp, git — shell operations)
//   - hanzo-sandbox (for WASM + JS execution engines)
//   - hanzo_engine (for EngineState, types, traits)

pub mod engine;
pub mod indexer;
