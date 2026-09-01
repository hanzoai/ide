// Memory — engine IPC shim.
//
// Thin wrapper around `invoke<T>('engine_memory_*')` so the view code can keep
// the historical `engine.foo()` call sites without dragging back the full
// Hanzo AI IPC client. Only the methods Memory actually uses live here.
//
// If you find yourself adding a method whose backend command isn't registered
// in `src-tauri/src/lib.rs`, register it on the Rust side first — don't shim
// dead commands.
//
// Backend command source of truth: `crates/hanzo-engine/src/commands/memory.rs`.

import { invoke } from '@tauri-apps/api/core';

import type {
  EmbeddingProjection,
  EngineMemory,
  EngineMemoryConfig,
  EngineMemoryStats,
  MemoryEdge,
} from './types';

/** Shape returned by `engine_embedding_status`. */
export interface EmbeddingStatus {
  ollama_running: boolean;
  model_available: boolean;
  model_name: string;
  error?: string;
}

/** Shape returned by `engine_memory_backfill`. */
export interface MemoryBackfillResult {
  success: number;
  failed: number;
}

/**
 * Memory's view of the backend. Flat object literal, not a class —
 * we just need a stable namespace for `invoke()` calls.
 */
export const engine = {
  // ── Memory CRUD ────────────────────────────────────────────────────────

  memoryStore(
    content: string,
    category?: string,
    importance?: number,
    agentId?: string,
  ): Promise<string> {
    return invoke<string>('engine_memory_store', { content, category, importance, agentId });
  },

  memorySearch(query: string, limit?: number, agentId?: string): Promise<EngineMemory[]> {
    return invoke<EngineMemory[]>('engine_memory_search', { query, limit, agentId });
  },

  memoryStats(): Promise<EngineMemoryStats> {
    return invoke<EngineMemoryStats>('engine_memory_stats');
  },

  memoryGet(id: string): Promise<EngineMemory | null> {
    return invoke<EngineMemory | null>('engine_memory_get', { id });
  },

  memoryUpdate(
    id: string,
    content: string,
    category: string,
    importance: number,
  ): Promise<void> {
    return invoke('engine_memory_update', { id, content, category, importance });
  },

  memoryDelete(id: string): Promise<void> {
    return invoke('engine_memory_delete', { id });
  },

  memoryList(limit?: number): Promise<EngineMemory[]> {
    return invoke<EngineMemory[]>('engine_memory_list', { limit });
  },

  memoryEdges(limit?: number): Promise<MemoryEdge[]> {
    return invoke<MemoryEdge[]>('engine_memory_edges', { limit });
  },

  // ── Memory config ──────────────────────────────────────────────────────

  getMemoryConfig(): Promise<EngineMemoryConfig> {
    return invoke<EngineMemoryConfig>('engine_get_memory_config');
  },

  // ── Embedding pipeline ─────────────────────────────────────────────────

  embeddingStatus(): Promise<EmbeddingStatus> {
    return invoke<EmbeddingStatus>('engine_embedding_status');
  },

  embeddingPullModel(): Promise<string> {
    return invoke<string>('engine_embedding_pull_model');
  },

  memoryBackfill(): Promise<MemoryBackfillResult> {
    return invoke<MemoryBackfillResult>('engine_memory_backfill');
  },

  memoryEmbeddingProjection(limit?: number): Promise<EmbeddingProjection> {
    return invoke<EmbeddingProjection>('engine_memory_embedding_projection', { limit });
  },
};
