// Local inference engines.
//
// The IDE does not install, bundle or spawn an engine. If one is already
// running on this machine it is used; if none is, the signed-in Hanzo account
// answers instead. Everything here speaks the OpenAI-compatible surface, so a
// single provider kind covers all of them.

use crate::atoms::types::{ProviderConfig, ProviderKind};
use std::time::Duration;

/// How long to wait on a local port before deciding nothing is there. Short:
/// this runs at startup and a missing engine must not delay anything.
const PROBE_TIMEOUT: Duration = Duration::from_millis(700);

/// The engines worth looking for, in the order they are preferred.
const KNOWN: &[(&str, &str)] = &[
    // Hanzo's own engine first — if it is up, it is what the user meant.
    ("hanzo-engine", "http://127.0.0.1:36900/v1"),
    ("ollama", "http://127.0.0.1:11434/v1"),
    ("lmstudio", "http://127.0.0.1:1234/v1"),
];

/// A local engine that answered, and the first model it offers.
#[derive(Debug, Clone)]
pub struct Local {
    pub id: &'static str,
    pub base_url: &'static str,
    pub model: Option<String>,
}

/// Ask one engine whether it is there, and what it serves.
async fn probe(client: &reqwest::Client, id: &'static str, base_url: &'static str) -> Option<Local> {
    let resp = client
        .get(format!("{base_url}/models"))
        .timeout(PROBE_TIMEOUT)
        .send()
        .await
        .ok()?;
    if !resp.status().is_success() {
        return None;
    }
    // A model list is a convenience, not a requirement — an engine that
    // answers but lists nothing is still an engine.
    let model = resp
        .json::<serde_json::Value>()
        .await
        .ok()
        .and_then(|v| {
            v.get("data")?
                .as_array()?
                .first()?
                .get("id")?
                .as_str()
                .map(str::to_string)
        });
    Some(Local { id, base_url, model })
}

/// The first local engine that answers, or None.
pub async fn detect() -> Option<Local> {
    let client = reqwest::Client::builder().timeout(PROBE_TIMEOUT).build().ok()?;
    for (id, base_url) in KNOWN {
        if let Some(found) = probe(&client, id, base_url).await {
            log::info!(
                "[engines] {} is running at {} ({})",
                found.id,
                found.base_url,
                found.model.as_deref().unwrap_or("no models listed")
            );
            return Some(found);
        }
    }
    log::info!("[engines] no local engine is running");
    None
}

/// Configure a detected engine as the provider, if nothing is configured yet.
///
/// Returns whether it added one. Never installs, never pulls, never spawns.
pub async fn adopt_local(state: &crate::engine::state::EngineState) -> Result<bool, String> {
    if !state.config.lock().providers.is_empty() {
        return Ok(false);
    }
    let Some(found) = detect().await else {
        return Ok(false);
    };

    let mut cfg = state.config.lock();
    cfg.providers.push(ProviderConfig {
        id: found.id.to_string(),
        kind: ProviderKind::OpenAI,
        api_key: String::new(), // local engines do not ask for one
        base_url: Some(found.base_url.to_string()),
        default_model: found.model.clone(),
        enabled_models: None,
    });
    cfg.default_provider = Some(found.id.to_string());
    if let Some(m) = found.model {
        cfg.default_model = Some(m);
    }
    let json = serde_json::to_string(&*cfg).map_err(|e| format!("serialise engine config: {e}"))?;
    state.store.set_config("engine_config", &json)?;
    log::info!("[engines] adopted the local {} engine", found.id);
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prefers_hanzo_then_ollama_then_lmstudio() {
        let order: Vec<&str> = KNOWN.iter().map(|(id, _)| *id).collect();
        assert_eq!(order, vec!["hanzo-engine", "ollama", "lmstudio"]);
    }

    #[test]
    fn every_known_engine_speaks_the_openai_surface() {
        // One provider kind covers all of them only if every base URL is the
        // OpenAI-compatible root.
        for (id, url) in KNOWN {
            assert!(url.ends_with("/v1"), "{id} base url should end in /v1: {url}");
        }
    }

    #[test]
    fn the_probe_timeout_cannot_delay_startup() {
        // Three engines probed in sequence, worst case.
        assert!(PROBE_TIMEOUT.saturating_mul(KNOWN.len() as u32) < Duration::from_secs(3));
    }
}
