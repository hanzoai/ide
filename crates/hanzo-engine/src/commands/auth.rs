// Sign-in.
//
// Hanzo IAM is the identity provider and the `hanzo` CLI already speaks its
// OIDC flow, so the IDE drives the CLI rather than carrying an auth
// implementation of its own. One account, one login, one credential on disk.

use crate::engine::cli;
use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct Account {
    /// `org/user` as IAM knows it, absent when nobody is signed in.
    pub identity: Option<String>,
    /// Billing org.
    pub org: Option<String>,
    pub signed_in: bool,
}

/// Parse `hanzo auth show`, which prints `identity:` and `org:` lines.
fn parse(out: &str) -> Account {
    let field = |key: &str| {
        out.lines()
            .find_map(|l| l.trim().strip_prefix(key))
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty())
    };
    let identity = field("identity:");
    // `org: hanzo (billed here)` — the parenthetical is a note, not the name.
    let org = field("org:").map(|o| {
        o.split(" (").next().unwrap_or(&o).trim().to_string()
    });
    Account {
        signed_in: identity.is_some(),
        identity,
        org,
    }
}

fn hanzo(args: &[&str]) -> Result<std::process::Output, String> {
    Command::new("hanzo")
        .args(args)
        .output()
        .map_err(|e| match e.kind() {
            std::io::ErrorKind::NotFound => {
                "the hanzo CLI is not installed — see https://hanzo.sh".to_string()
            }
            _ => format!("could not run the hanzo CLI: {e}"),
        })
}

#[tauri::command]
pub fn auth_status() -> Result<Account, String> {
    let out = hanzo(&["auth", "show"])?;
    // A signed-out CLI exits non-zero but still prints what it knows, so the
    // stdout is worth parsing either way.
    let text = String::from_utf8_lossy(&out.stdout);
    let mut acct = parse(&text);
    // An expired session prints an identity but cannot reach userinfo.
    if !out.status.success() && cli::api_key().is_none() {
        acct.signed_in = false;
    }
    Ok(acct)
}

/// Start the IAM sign-in. The CLI opens the browser and writes the credential
/// to `~/.hanzo` when the user finishes; poll `auth_status` for the result.
#[tauri::command]
pub fn auth_login() -> Result<(), String> {
    Command::new("hanzo")
        .args(["auth", "login", "--brand", "hanzo"])
        .spawn()
        .map(|_| ())
        .map_err(|e| match e.kind() {
            std::io::ErrorKind::NotFound => {
                "the hanzo CLI is not installed — see https://hanzo.sh".to_string()
            }
            _ => format!("could not start sign-in: {e}"),
        })
}

#[tauri::command]
pub fn auth_logout() -> Result<(), String> {
    let out = hanzo(&["auth", "logout"])?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_identity_and_org() {
        let a = parse("identity: hanzo/a\norg: hanzo (billed here)\n");
        assert_eq!(a.identity.as_deref(), Some("hanzo/a"));
        assert_eq!(a.org.as_deref(), Some("hanzo"));
        assert!(a.signed_in);
    }

    #[test]
    fn signed_out_has_no_identity() {
        let a = parse("Error: userinfo failed (401 Unauthorized)\n");
        assert!(a.identity.is_none());
        assert!(!a.signed_in);
    }

    #[test]
    fn tolerates_a_warning_line_first() {
        let a = parse("warning: could not refresh the hanzo credential\nidentity: hanzo/a\norg: hanzo\n");
        assert_eq!(a.identity.as_deref(), Some("hanzo/a"));
        assert_eq!(a.org.as_deref(), Some("hanzo"));
    }
}
