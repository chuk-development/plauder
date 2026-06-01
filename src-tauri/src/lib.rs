mod config;
mod database;

use config::EnvConfig;
use database::{Correction, Database, Recording};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

/// Resolve the install/data directory that holds history.db, .env and the
/// voice-input.sh script. Mirrors how voice-input.sh resolves SCRIPT_DIR so the
/// GUI reads/writes exactly the same files.
fn data_dir() -> PathBuf {
    if let Ok(d) = std::env::var("FLUISTERN_DIR") {
        return PathBuf::from(d);
    }
    // Next to the executable (install layout: ~/.local/share/plauder/)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            if parent.join("history.db").exists() || parent.join(".env").exists() {
                return parent.to_path_buf();
            }
        }
    }
    // Fall back to the standard install location.
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".local/share/plauder")
}

fn db_file() -> PathBuf {
    data_dir().join("history.db")
}

fn env_file() -> PathBuf {
    data_dir().join(".env")
}

fn log_file() -> PathBuf {
    PathBuf::from("/tmp/voice-input-debug.log")
}

fn open_db() -> Result<Database, String> {
    Database::new(db_file()).map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub api_key: String,
    pub mic_source: String,
    pub language: String,
    pub notifications: bool,
    pub tray_icon: bool,
    pub system_prompt: String,
}

// ---- Commands ----

#[tauri::command]
fn get_recordings() -> Result<Vec<Recording>, String> {
    open_db()?.get_all_recordings(200).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_corrections() -> Result<Vec<Correction>, String> {
    open_db()?.get_corrections().map_err(|e| e.to_string())
}

#[tauri::command]
fn add_correction(whisper_pattern: String, intended_text: String) -> Result<(), String> {
    let p = whisper_pattern.trim();
    let i = intended_text.trim();
    if p.is_empty() || i.is_empty() {
        return Err("Both fields are required".into());
    }
    open_db()?
        .add_correction(p, i)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn edit_correction(id: i64, whisper_pattern: String, intended_text: String) -> Result<(), String> {
    let p = whisper_pattern.trim();
    let i = intended_text.trim();
    if p.is_empty() || i.is_empty() {
        return Err("Both fields are required".into());
    }
    open_db()?
        .edit_correction(id, p, i)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_correction(id: i64) -> Result<(), String> {
    open_db()?.delete_correction(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_correction(id: i64, text: String) -> Result<(), String> {
    open_db()?
        .update_correction(id, &text)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_recording(id: i64) -> Result<(), String> {
    open_db()?.delete_recording(id).map_err(|e| e.to_string())
}

/// Return only the tail of the debug log. The full file can grow to many MB,
/// and shipping all of it over IPC + rendering it in one DOM node crashes the
/// webview, so we read at most the last ~200 KB and drop the partial first line.
#[tauri::command]
fn get_logs() -> String {
    use std::io::{Read, Seek, SeekFrom};

    const MAX_BYTES: u64 = 200 * 1024;

    let path = log_file();
    let mut file = match std::fs::File::open(&path) {
        Ok(f) => f,
        Err(_) => {
            return "No logs yet.\n\nLogs will appear here on the next voice input.".to_string()
        }
    };

    let len = file.metadata().map(|m| m.len()).unwrap_or(0);
    let truncated = len > MAX_BYTES;
    let start = len.saturating_sub(MAX_BYTES);
    if file.seek(SeekFrom::Start(start)).is_err() {
        return String::new();
    }

    let mut buf = Vec::new();
    if file.read_to_end(&mut buf).is_err() {
        return String::new();
    }

    let mut text = String::from_utf8_lossy(&buf).into_owned();
    if truncated {
        // Drop the partial first line, then mark that earlier lines were cut.
        if let Some(nl) = text.find('\n') {
            text = text[nl + 1..].to_string();
        }
        text = format!("… (showing last {} KB of log) …\n{}", MAX_BYTES / 1024, text);
    }
    text
}

#[tauri::command]
fn clear_logs() -> Result<(), String> {
    let f = log_file();
    if f.exists() {
        std::fs::remove_file(f).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_settings() -> Settings {
    let cfg = EnvConfig::new(env_file());
    Settings {
        api_key: cfg.get("GROQ_API_KEY").unwrap_or("").to_string(),
        mic_source: cfg.get("MIC_SOURCE").unwrap_or("").to_string(),
        language: cfg.get("LANGUAGE").unwrap_or("").to_string(),
        notifications: cfg.get("NOTIFICATIONS").unwrap_or("true") == "true",
        tray_icon: cfg.get("TRAY_ICON").unwrap_or("true") == "true",
        system_prompt: cfg
            .get("SYSTEM_PROMPT")
            .unwrap_or(EnvConfig::get_default_system_prompt())
            .to_string(),
    }
}

#[tauri::command]
fn save_settings(settings: Settings) -> Result<(), String> {
    let mut cfg = EnvConfig::new(env_file());
    cfg.set("GROQ_API_KEY".into(), settings.api_key);
    cfg.set("MIC_SOURCE".into(), settings.mic_source);
    cfg.set("LANGUAGE".into(), settings.language);
    cfg.set(
        "NOTIFICATIONS".into(),
        if settings.notifications { "true" } else { "false" }.into(),
    );
    cfg.set(
        "TRAY_ICON".into(),
        if settings.tray_icon { "true" } else { "false" }.into(),
    );
    cfg.set("SYSTEM_PROMPT".into(), settings.system_prompt);
    cfg.save().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_default_prompt() -> String {
    EnvConfig::get_default_system_prompt().to_string()
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MicSource {
    pub id: String,
    pub label: String,
}

/// List available PipeWire/PulseAudio input sources via `pactl`, so the GUI can
/// offer a mic dropdown instead of a free-text field (mirrors select-mic.sh).
#[tauri::command]
fn list_mics() -> Vec<MicSource> {
    let out = match Command::new("pactl")
        .args(["list", "sources", "short"])
        .output()
    {
        Ok(o) => o,
        Err(_) => return Vec::new(),
    };
    let text = String::from_utf8_lossy(&out.stdout);
    let mut mics = vec![MicSource {
        id: String::new(),
        label: "System default".to_string(),
    }];
    for line in text.lines() {
        let cols: Vec<&str> = line.split('\t').collect();
        if cols.len() < 2 {
            continue;
        }
        let name = cols[1];
        if name.contains("monitor") {
            continue;
        }
        // Build a friendlier label from the device name.
        let label = name
            .replace("alsa_input.", "")
            .replace('_', " ")
            .replace('.', " ");
        mics.push(MicSource {
            id: name.to_string(),
            label,
        });
    }
    mics
}

/// Whether the voice pipeline is currently recording (state file present).
#[tauri::command]
fn is_recording() -> bool {
    std::path::Path::new("/tmp/voice-input-state").exists()
}

/// Toggle recording by invoking the same voice-input.sh the keybind uses.
#[tauri::command]
fn toggle_recording() -> Result<(), String> {
    let script = data_dir().join("voice-input.sh");
    Command::new("bash")
        .arg(script)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Run voice-input.sh detached (used by the tray "Toggle recording" item).
fn spawn_toggle() {
    let script = data_dir().join("voice-input.sh");
    let _ = Command::new("bash").arg(script).spawn();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::menu::{MenuBuilder, MenuItemBuilder};
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
    use tauri::{Manager, WindowEvent};

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let toggle_i = MenuItemBuilder::with_id("toggle", "Aufnahme starten/stoppen")
                .build(app)?;
            let show_i = MenuItemBuilder::with_id("show", "Fenster zeigen").build(app)?;
            let hide_i = MenuItemBuilder::with_id("hide", "Fenster verbergen").build(app)?;
            let quit_i = MenuItemBuilder::with_id("quit", "Beenden").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&toggle_i, &show_i, &hide_i])
                .separator()
                .items(&[&quit_i])
                .build()?;

            // Load a dedicated 32x32 tray icon. Using default_window_icon()
            // panics ("wrong data size") because its raw buffer doesn't match
            // the size the tray backend expects.
            let tray_icon = tauri::image::Image::from_bytes(include_bytes!(
                "../icons/32x32.png"
            ))?;

            TrayIconBuilder::with_id("main")
                .icon(tray_icon)
                .tooltip("Plauder — Voice Dictation")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "toggle" => spawn_toggle(),
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.hide();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // Left-click toggles the main window visibility.
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            if w.is_visible().unwrap_or(false) {
                                let _ = w.hide();
                            } else {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the window hides it to the tray instead of quitting.
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_recordings,
            get_corrections,
            add_correction,
            edit_correction,
            delete_correction,
            save_correction,
            delete_recording,
            get_logs,
            clear_logs,
            get_settings,
            save_settings,
            get_default_prompt,
            toggle_recording,
            list_mics,
            is_recording,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
