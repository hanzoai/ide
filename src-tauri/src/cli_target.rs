// CLI Quick-File & Workspace Launch Target Resolution (Zed-Speed Startup)
//
// Supports launching `hanzo-ide` with:
//   - Single file (`hanzo-ide /path/to/file.rs` or `hanzo-ide src/lib.rs:42:5`)
//     -> opens directly in distraction-free quick-file editor (<500ms, zero heavy sidebars)
//   - Folder (`hanzo-ide /path/to/dir` or `hanzo-ide .`)
//     -> opens workspace folder directly via URL hash
//   - Optional layout flag (`--zen-layout=default|expanded|mcp`)

use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
pub struct CliLaunchTarget {
    /// `"file"`, `"folder"`, or `"none"`.
    pub kind: String,
    pub path: Option<String>,
    pub extra_files: Vec<String>,
    pub line: Option<u32>,
    pub column: Option<u32>,
    pub zen_layout: Option<String>,
}

impl CliLaunchTarget {
    pub fn none() -> Self {
        Self {
            kind: "none".to_string(),
            path: None,
            extra_files: Vec::new(),
            line: None,
            column: None,
            zen_layout: None,
        }
    }

    /// Build query + hash suffix for the initial main `WebviewUrl` (e.g. `?quickFile=...` or `#...`).
    pub fn to_url_suffix(&self) -> String {
        let mut query: Vec<String> = Vec::new();
        if let Some(ref layout) = self.zen_layout {
            query.push(format!("zenLayout={}", urlencoding::encode(layout)));
        }
        if self.kind == "file" {
            if let Some(ref p) = self.path {
                query.push(format!("quickFile={}", urlencoding::encode(p)));
                if let Some(line) = self.line {
                    query.push(format!("line={line}"));
                }
                if let Some(col) = self.column {
                    query.push(format!("col={col}"));
                }
                if self.zen_layout.is_none() {
                    query.push("skipSignIn=1".to_string());
                }
            }
        }
        let q = if query.is_empty() {
            String::new()
        } else {
            format!("?{}", query.join("&"))
        };
        if self.kind == "folder" {
            if let Some(ref p) = self.path {
                return format!("{q}#{}", urlencoding::encode(p));
            }
        }
        q
    }
}

/// Split optional `:line[:column]` suffix off a CLI file argument (unless the
/// full raw string itself already exists on disk).
fn split_path_line_col(raw: &str, cwd: &Path) -> (PathBuf, Option<u32>, Option<u32>) {
    let direct = resolve_against_cwd(raw, cwd);
    if direct.exists() {
        return (direct, None, None);
    }

    let parts: Vec<&str> = raw.rsplitn(3, ':').collect();
    if parts.len() >= 2 {
        if let Ok(last_num) = parts[0].parse::<u32>() {
            // Could be `path:line:col` or `path:line`
            if parts.len() == 3 {
                if let Ok(mid_num) = parts[1].parse::<u32>() {
                    let base = parts[2];
                    if !base.is_empty() && !(cfg!(windows) && base.len() == 1) {
                        return (resolve_against_cwd(base, cwd), Some(mid_num), Some(last_num));
                    }
                }
            }
            let base = &raw[..raw.len() - parts[0].len() - 1];
            if !base.is_empty() && !(cfg!(windows) && base.len() == 1) {
                return (resolve_against_cwd(base, cwd), Some(last_num), None);
            }
        }
    }

    (direct, None, None)
}

fn resolve_against_cwd(raw: &str, cwd: &Path) -> PathBuf {
    let p = Path::new(raw);
    let joined = if p.is_absolute() {
        p.to_path_buf()
    } else {
        cwd.join(p)
    };
    std::fs::canonicalize(&joined).unwrap_or(joined)
}

pub fn parse_cli_launch_target<I, S>(args: I, cwd: &Path) -> CliLaunchTarget
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    let mut zen_layout: Option<String> = None;
    let mut positionals: Vec<String> = Vec::new();

    for raw_arg in args {
        let arg = raw_arg.as_ref().trim();
        if arg.is_empty() {
            continue;
        }
        if let Some(val) = arg.strip_prefix("--zen-layout=") {
            if !val.is_empty() {
                zen_layout = Some(val.to_string());
            }
            continue;
        }
        if arg == "--mcp-drawer" {
            zen_layout = Some("mcp".to_string());
            continue;
        }
        if arg.starts_with('-') {
            continue;
        }
        positionals.push(arg.to_string());
    }

    if positionals.is_empty() {
        return CliLaunchTarget {
            zen_layout,
            ..CliLaunchTarget::none()
        };
    }

    let (resolved, line, column) = split_path_line_col(&positionals[0], cwd);
    let kind = if resolved.is_dir() {
        "folder"
    } else {
        "file"
    };
    let base_dir = if resolved.is_dir() {
        resolved.clone()
    } else {
        cwd.to_path_buf()
    };
    let extra_files: Vec<String> = positionals
        .iter()
        .skip(1)
        .map(|raw| split_path_line_col(raw, &base_dir).0.to_string_lossy().into_owned())
        .collect();

    CliLaunchTarget {
        kind: kind.to_string(),
        path: Some(resolved.to_string_lossy().into_owned()),
        extra_files,
        line,
        column,
        zen_layout,
    }
}

pub fn detect_process_cli_target() -> CliLaunchTarget {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    parse_cli_launch_target(std::env::args().skip(1), &cwd)
}

#[tauri::command]
pub fn get_cli_launch_target() -> CliLaunchTarget {
    detect_process_cli_target()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_file_with_line_and_column() {
        let cwd = std::env::temp_dir().join("hanzo-cli-target-nonexistent");
        let expected_path = cwd
            .join(Path::new("notes/todo.rs"))
            .to_string_lossy()
            .into_owned();
        let expected_query = format!("quickFile={}", urlencoding::encode(&expected_path));

        let target = parse_cli_launch_target(["--no-sandbox", "notes/todo.rs:42:7"], &cwd);
        assert_eq!(target.kind, "file");
        assert_eq!(target.path.as_deref(), Some(expected_path.as_str()));
        assert_eq!(target.line, Some(42));
        assert_eq!(target.column, Some(7));
        let suffix = target.to_url_suffix();
        assert!(suffix.contains(&expected_query));
        assert!(suffix.contains("line=42"));
        assert!(suffix.contains("col=7"));

        #[cfg(unix)]
        {
            let unix_cwd = Path::new("/tmp/hanzo-cli-target-nonexistent");
            let unix_target = parse_cli_launch_target(["--no-sandbox", "notes/todo.rs:42:7"], unix_cwd);
            assert_eq!(
                unix_target.path.as_deref(),
                Some("/tmp/hanzo-cli-target-nonexistent/notes/todo.rs")
            );
            assert!(unix_target
                .to_url_suffix()
                .contains("quickFile=%2Ftmp%2Fhanzo-cli-target-nonexistent%2Fnotes%2Ftodo.rs"));
        }
    }

    #[test]
    fn parses_existing_directory_as_folder_workspace() {
        let cwd = std::env::temp_dir();
        let target = parse_cli_launch_target(["."], &cwd);
        assert_eq!(target.kind, "folder");
        assert!(target.to_url_suffix().contains('#'));
    }

    #[test]
    fn parses_zen_layout_flag_without_positional() {
        let cwd = Path::new("/tmp");
        let target = parse_cli_launch_target(["--zen-layout=expanded"], cwd);
        assert_eq!(target.kind, "none");
        assert_eq!(target.zen_layout.as_deref(), Some("expanded"));
        assert_eq!(target.to_url_suffix(), "?zenLayout=expanded");
    }
}
