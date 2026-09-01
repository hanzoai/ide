// ── Hanzo Engine Layer ───────────────────────────────────────────────────────
// Wraps the Hanzo AI engine with IDE-specific tool execution.
// Hooks in via ExternalToolExecutor trait defined in Hanzo AI.

pub mod tools;
pub mod tool_filter;
pub mod frontend_bridge;

use hanzo_engine::engine::tools::ExternalToolExecutor;

/// Hanzo's IDE tool executor — routes ide_* and execute_code calls.
pub struct HanzoToolExecutor;

#[async_trait::async_trait]
impl ExternalToolExecutor for HanzoToolExecutor {
    async fn try_execute(
        &self,
        name: &str,
        args: &serde_json::Value,
        _agent_id: &str,
        app_handle: &tauri::AppHandle,
    ) -> Option<Result<String, String>> {
        tools::execute(name, args, app_handle).await
    }

    fn tool_definitions(&self) -> Vec<hanzo_engine::atoms::types::ToolDefinition> {
        tools::definitions()
    }

    fn tool_definitions_dynamic(&self, _app_handle: &tauri::AppHandle) -> Vec<hanzo_engine::atoms::types::ToolDefinition> {
        tools::definitions()
    }
}
