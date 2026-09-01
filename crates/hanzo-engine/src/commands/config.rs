// commands/config.rs — Thin wrappers for engine config, sandbox, and auto-setup.

use crate::commands::state::EngineState;
use crate::engine::types::*;
use log::info;
use std::sync::atomic::Ordering;
use tauri::{Emitter, State};

// Docker sandbox commands (engine_sandbox_check / get_config / set_config)
// were removed in Hanzo phase 1 along with engine::sandbox.

// ── Engine configuration ───────────────────────────────────────────────

#[tauri::command]
pub fn engine_get_config(state: State<'_, EngineState>) -> Result<EngineConfig, String> {
    let cfg = state.config.lock();
    Ok(cfg.clone())
}

/// Get the current daily token spend and budget status.
#[tauri::command]
pub fn engine_get_daily_spend(state: State<'_, EngineState>) -> Result<serde_json::Value, String> {
    let (input_tokens, output_tokens, estimated_usd) = state.daily_tokens.estimated_spend_usd();
    let cache_read = state.daily_tokens.cache_read_tokens.load(Ordering::Relaxed);
    let cache_create = state
        .daily_tokens
        .cache_create_tokens
        .load(Ordering::Relaxed);
    let budget = {
        let cfg = state.config.lock();
        cfg.daily_budget_usd
    };
    let budget_pct = if budget > 0.0 {
        (estimated_usd / budget * 100.0).min(100.0)
    } else {
        0.0
    };
    Ok(serde_json::json!({
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cache_read_tokens": cache_read,
        "cache_create_tokens": cache_create,
        "estimated_usd": format!("{:.2}", estimated_usd),
        "budget_usd": budget,
        "budget_pct": format!("{:.0}", budget_pct),
        "over_budget": budget > 0.0 && estimated_usd >= budget,
    }))
}

#[tauri::command]
pub fn engine_set_config(
    app_handle: tauri::AppHandle,
    state: State<'_, EngineState>,
    config: EngineConfig,
) -> Result<(), String> {
    let json = serde_json::to_string(&config).map_err(|e| format!("Serialize error: {}", e))?;

    // Persist to DB
    state.store.set_config("engine_config", &json)?;

    // Update in-memory config
    let mut cfg = state.config.lock();
    *cfg = config;

    info!(
        "[engine] Config updated, {} providers configured",
        cfg.providers.len()
    );

    // Notify frontend to refresh model selectors
    let _ = app_handle.emit("provider-updated", ());

    Ok(())
}

/// Add or update a single provider without replacing the entire config.
#[tauri::command]
pub fn engine_upsert_provider(
    app_handle: tauri::AppHandle,
    state: State<'_, EngineState>,
    provider: ProviderConfig,
) -> Result<(), String> {
    let mut cfg = state.config.lock();

    // Update existing or add new
    if let Some(existing) = cfg.providers.iter_mut().find(|p| p.id == provider.id) {
        *existing = provider;
    } else {
        cfg.providers.push(provider);
    }

    // Set as default if it's the first provider
    if cfg.default_provider.is_none() && !cfg.providers.is_empty() {
        cfg.default_provider = Some(cfg.providers[0].id.clone());
    }

    // Persist
    let json = serde_json::to_string(&*cfg).map_err(|e| format!("Serialize error: {}", e))?;
    state.store.set_config("engine_config", &json)?;

    info!(
        "[engine] Provider upserted, {} total providers",
        cfg.providers.len()
    );

    // Notify frontend to refresh model selectors
    let _ = app_handle.emit("provider-updated", ());

    Ok(())
}

/// Remove a provider by ID.
#[tauri::command]
pub fn engine_remove_provider(
    app_handle: tauri::AppHandle,
    state: State<'_, EngineState>,
    provider_id: String,
) -> Result<(), String> {
    let mut cfg = state.config.lock();

    cfg.providers.retain(|p| p.id != provider_id);

    // Clear default if it was the removed provider
    if cfg.default_provider.as_deref() == Some(&provider_id) {
        cfg.default_provider = cfg.providers.first().map(|p| p.id.clone());
    }

    let json = serde_json::to_string(&*cfg).map_err(|e| format!("Serialize error: {}", e))?;
    state.store.set_config("engine_config", &json)?;

    info!(
        "[engine] Provider removed, {} remaining",
        cfg.providers.len()
    );

    // Notify frontend to refresh model selectors
    let _ = app_handle.emit("provider-updated", ());

    Ok(())
}

/// List available models from a provider (e.g. Azure AI Foundry model discovery).
#[tauri::command]
pub async fn engine_list_provider_models(
    state: State<'_, EngineState>,
    provider_id: String,
) -> Result<Vec<serde_json::Value>, String> {
    let provider_config = {
        let cfg = state.config.lock();
        cfg.providers
            .iter()
            .find(|p| p.id == provider_id)
            .cloned()
            .ok_or_else(|| format!("Provider '{}' not found", provider_id))?
    };

    let provider = crate::engine::providers::AnyProvider::from_config(&provider_config);
    let models = provider
        .list_models()
        .await
        .map_err(|e| format!("Failed to list models: {}", e))?;

    Ok(models
        .into_iter()
        .map(|m| {
            serde_json::json!({
                "id": m.id,
                "name": m.name,
                "context_window": m.context_window,
                "max_output": m.max_output,
            })
        })
        .collect())
}

/// Check if the engine is configured and ready to use.
#[tauri::command]
pub fn engine_status(state: State<'_, EngineState>) -> Result<serde_json::Value, String> {
    let cfg = state.config.lock();

    let has_providers = !cfg.providers.is_empty();
    let has_api_key = cfg.providers.iter().any(|p| !p.api_key.is_empty());

    Ok(serde_json::json!({
        "ready": has_providers && has_api_key,
        "providers": cfg.providers.len(),
        "has_api_key": has_api_key,
        "default_model": cfg.default_model,
        "default_provider": cfg.default_provider,
    }))
}

/// Auto-setup: detect Ollama on first run and add it as a provider.
/// Returns what was done so the frontend can show a toast.
#[tauri::command]
pub fn engine_storage_get_paths(
    state: State<'_, EngineState>,
) -> Result<serde_json::Value, String> {
    let data_root = crate::engine::paths::data_dir();
    let custom_root = crate::engine::paths::get_data_root_override();
    let default_root = crate::engine::paths::default_data_dir()
        .to_string_lossy()
        .to_string();

    // Compute approximate sizes
    let engine_db = crate::engine::paths::engine_db_path();
    let engine_db_size = std::fs::metadata(&engine_db).map(|m| m.len()).unwrap_or(0);

    let workspaces_dir = crate::engine::paths::workspaces_base_dir();
    let workspaces_size = dir_size(&workspaces_dir);

    let skills_dir = crate::engine::paths::skills_dir().unwrap_or_default();
    let skills_size = dir_size(&skills_dir);

    let browser_dir = data_root.join("browser-profiles");
    let browser_size = dir_size(&browser_dir);

    // Get workspace path from frontend config (if stored in engine config)
    let workspace_path = state.store.get_config("user_workspace_path").ok().flatten();

    Ok(serde_json::json!({
        "data_root": data_root.to_string_lossy(),
        "default_root": default_root,
        "is_custom": custom_root.is_some(),
        "engine_db": engine_db.to_string_lossy(),
        "engine_db_size": engine_db_size,
        "workspaces_dir": workspaces_dir.to_string_lossy(),
        "workspaces_size": workspaces_size,
        "skills_dir": skills_dir.to_string_lossy(),
        "skills_size": skills_size,
        "browser_dir": browser_dir.to_string_lossy(),
        "browser_size": browser_size,
        "workspace_path": workspace_path,
    }))
}

/// Set (or reset) the data root directory.
/// Pass `null` to reset to default `~/.hanzo/`.
/// Requires an app restart to take full effect.
#[tauri::command]
pub fn engine_storage_set_data_root(
    _state: State<'_, EngineState>,
    path: Option<String>,
) -> Result<(), String> {
    match &path {
        Some(p) if !p.is_empty() => {
            // Validate the path exists and is a directory (or can be created)
            let pb = std::path::PathBuf::from(p);
            std::fs::create_dir_all(&pb)
                .map_err(|e| format!("Cannot create directory '{}': {}", p, e))?;
            crate::engine::paths::save_data_root_to_conf(Some(p))?;
            crate::engine::paths::set_data_root_override(Some(pb));
            info!("[storage] Data root changed to: {}", p);
        }
        _ => {
            crate::engine::paths::save_data_root_to_conf(None)?;
            crate::engine::paths::set_data_root_override(None);
            info!("[storage] Data root reset to default (~/.hanzo/)");
        }
    }
    Ok(())
}

/// Recursive directory size in bytes.
fn dir_size(path: &std::path::Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    walkdir_calc(path)
}

fn walkdir_calc(path: &std::path::Path) -> u64 {
    let mut total = 0u64;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let meta = entry.metadata();
            if let Ok(m) = meta {
                if m.is_dir() {
                    total += walkdir_calc(&entry.path());
                } else {
                    total += m.len();
                }
            }
        }
    }
    total
}
