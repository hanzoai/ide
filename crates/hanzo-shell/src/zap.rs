// The IDE on the local ZAP bus.
//
// ZAP is how Hanzo services talk to each other, so a running IDE is a peer on
// it rather than something only its own window can reach. The socket lives at
// ~/.hanzo/ide.sock, which is where the rest of the toolchain looks.
//
// The surface is deliberately small. Reading and writing files needs no help
// from us — any local process already has the filesystem. What only a running
// editor can do is show something to the person sitting in front of it, so
// that is what it offers.

use serde::Serialize;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use zapwire::rpc::{build_response, parse_request, STATUS_BAD_REQUEST, STATUS_OK};
use zapwire::transport::Server;

/// Method numbers. Stable — peers compile against them.
pub const PING: u32 = 1;
pub const INFO: u32 = 2;
pub const OPEN: u32 = 3;

#[derive(Serialize)]
struct Info {
    name: &'static str,
    version: &'static str,
    /// Absent until a folder is open.
    workspace: Option<String>,
}

/// `~/.hanzo/ide.sock`.
pub fn socket_path() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".hanzo").join("ide.sock"))
}

/// Serve the local bus for as long as the app runs.
///
/// A failure here costs the IDE nothing it needs for itself, so it is logged
/// and the app carries on.
pub async fn serve(app: AppHandle, workspace: Option<String>) {
    let Some(path) = socket_path() else {
        log::warn!("[zap] no home directory — not serving the local bus");
        return;
    };
    if let Some(dir) = path.parent() {
        if let Err(e) = std::fs::create_dir_all(dir) {
            log::warn!("[zap] cannot create {}: {e}", dir.display());
            return;
        }
    }
    let addr = path.to_string_lossy().to_string();

    let server = Server::listen(&addr, move |_conn| {
        let app = app.clone();
        let workspace = workspace.clone();
        move |envelope: &[u8]| {
            let call = parse_request(envelope)?;
            let (status, body) = match call.method {
                PING => (STATUS_OK, b"pong".to_vec()),
                INFO => {
                    let info = Info {
                        name: "hanzo-ide",
                        version: env!("CARGO_PKG_VERSION"),
                        workspace: workspace.clone(),
                    };
                    (STATUS_OK, serde_json::to_vec(&info).unwrap_or_default())
                }
                OPEN => match std::str::from_utf8(&call.payload) {
                    Ok(p) if !p.is_empty() => {
                        // The window owns the editor; hand it the path.
                        let _ = app.emit("zap-open", p.to_string());
                        (STATUS_OK, Vec::new())
                    }
                    _ => (STATUS_BAD_REQUEST, b"open expects a path".to_vec()),
                },
                other => (
                    STATUS_BAD_REQUEST,
                    format!("unknown method {other}").into_bytes(),
                ),
            };
            Ok(build_response(status, call.promise_id, &body))
        }
    })
    .await;

    match server {
        // Only this user may drive their editor.
        Ok(s) => {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
            }
            log::info!("[zap] serving the local bus on {}", s.addr());
            // Hold the server for the life of the process; dropping it closes
            // the listener.
            std::mem::forget(s);
        }
        Err(e) => log::warn!("[zap] cannot bind {addr}: {e}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use zapwire::transport::Conn;

    /// The dispatch half, without a Tauri app behind it — the same match the
    /// server installs, so the wire contract is what is under test.
    fn dispatch(call: &zapwire::rpc::Call) -> (u32, Vec<u8>) {
        match call.method {
            PING => (STATUS_OK, b"pong".to_vec()),
            INFO => (
                STATUS_OK,
                serde_json::to_vec(&Info {
                    name: "hanzo-ide",
                    version: "test",
                    workspace: Some("/tmp/w".into()),
                })
                .unwrap(),
            ),
            OPEN => match std::str::from_utf8(&call.payload) {
                Ok(p) if !p.is_empty() => (STATUS_OK, Vec::new()),
                _ => (STATUS_BAD_REQUEST, b"open expects a path".to_vec()),
            },
            other => (
                STATUS_BAD_REQUEST,
                format!("unknown method {other}").into_bytes(),
            ),
        }
    }

    /// Tests run in one process and in parallel, so each needs its own socket.
    async fn peer(name: &str) -> (zapwire::transport::Server, std::sync::Arc<Conn>) {
        let dir = std::env::temp_dir().join(format!("hanzo-zap-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let addr = dir.join(format!("{name}.sock")).to_string_lossy().to_string();
        let srv = zapwire::transport::Server::listen(&addr, |_c| {
            |env: &[u8]| {
                let call = parse_request(env)?;
                let (status, body) = dispatch(&call);
                Ok(build_response(status, call.promise_id, &body))
            }
        })
        .await
        .unwrap();
        let conn = Conn::connect(srv.addr()).await.unwrap();
        (srv, conn)
    }

    #[tokio::test]
    async fn answers_ping_over_a_unix_socket() {
        let (_srv, conn) = peer("ping").await;
        let r = conn.invoke(PING, &[], b"").await.unwrap();
        assert!(r.is_ok());
        assert_eq!(r.body, b"pong");
    }

    #[tokio::test]
    async fn reports_the_open_workspace() {
        let (_srv, conn) = peer("info").await;
        let r = conn.invoke(INFO, &[], b"").await.unwrap();
        let v: serde_json::Value = serde_json::from_slice(&r.body).unwrap();
        assert_eq!(v["name"], "hanzo-ide");
        assert_eq!(v["workspace"], "/tmp/w");
    }

    #[tokio::test]
    async fn open_needs_a_path() {
        let (_srv, conn) = peer("open").await;
        assert!(conn.invoke(OPEN, &[], b"/tmp/x.rs").await.unwrap().is_ok());
        let empty = conn.invoke(OPEN, &[], b"").await.unwrap();
        assert_eq!(empty.status, STATUS_BAD_REQUEST);
    }

    #[tokio::test]
    async fn refuses_a_method_it_does_not_know() {
        let (_srv, conn) = peer("unknown").await;
        let r = conn.invoke(9999, &[], b"").await.unwrap();
        assert_eq!(r.status, STATUS_BAD_REQUEST);
    }
}
