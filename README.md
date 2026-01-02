# Plauder

> WhisperFlow-style voice dictation for Linux

A lightweight voice-to-text tool that uses Groq's Whisper API for transcription and LLM for formatting. Works with any X11/Wayland window manager.

## Features

- **Fast transcription** using Groq's Whisper Large V3 Turbo
- **Smart formatting** with automatic punctuation and capitalization
- **Modern Tauri + React GUI** - Web UI (React 19 + Tailwind v4) in a native Rust shell
- **Never swallows text** - truncated LLM output falls back to the full raw transcript
- **System tray icon** with status indicators
- **50+ languages** including Hindi, Arabic, Chinese, and more
- **Microphone selection** via tray menu
- **Keyboard shortcut** toggle (start/stop recording)
- **Pastes directly** into any focused text field
- **Recording history** with corrections and timing data

## Demo

```
[Press shortcut] → Recording...
[Speak] "hello world this is a test"
[Press shortcut] → Processing...
[Output] "Hello world, this is a test."
```

## Requirements

- Linux with X11 or Wayland
- PipeWire or PulseAudio
- Rust/Cargo + Node.js + pnpm (for building the GUI)
- WebKitGTK 4.1 dev libs (Tauri runtime)
- Groq API key (free tier available)

## Installation

```bash
git clone https://github.com/chukfinley/plauder.git
cd plauder
./install.sh
```

The installer will:
1. Check and install dependencies (if needed)
2. Build the Tauri + React GUI (Release mode, optimized)
3. Copy files to `~/.local/share/plauder/`
4. Create `plauder` command in `~/.local/bin/`
5. Set up systemd service
6. Prompt for Groq API key

After install, you can delete the cloned folder.

## Dependencies

The installer will check for these:

**Required:**
- `cargo` / `rust` - Rust toolchain (Tauri backend)
- `node` + `pnpm` - build the React frontend
- `webkit2gtk-4.1` - Tauri webview runtime
- `yad` - tray icon
- `xdotool` - simulating paste
- `xclip` - clipboard access
- `ffmpeg` - audio compression
- `jq` - JSON parsing
- `curl` - API calls
- `pw-record` (PipeWire)
- `sqlite3` - database for recording history

**On Ubuntu/Debian:**
```bash
sudo apt install cargo nodejs yad xdotool xclip ffmpeg jq curl pipewire sqlite3 \
  libwebkit2gtk-4.1-dev build-essential libssl-dev libayatana-appindicator3-dev librsvg2-dev
sudo npm install -g pnpm
```

**On Arch/Manjaro:**
```bash
sudo pacman -S rust nodejs pnpm yad xdotool xclip ffmpeg jq curl pipewire sqlite3 \
  webkit2gtk-4.1 libappindicator-gtk3 librsvg
```

## Configuration

### Get Groq API Key

1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Create a free account
3. Generate an API key
4. The installer will prompt you, or edit `~/.local/share/plauder/.env`

### Config Options

Edit `~/.local/share/plauder/.env`:

```bash
GROQ_API_KEY="your-key"      # Required
LANGUAGE="de"                 # Optional: en, de, es, fr, hi, etc.
MIC_SOURCE=""                 # Optional: specific mic (use tray menu to select)
NOTIFICATIONS="true"          # Show notifications (true/false)
TRAY_ICON="true"              # Show tray icon (true/false)
```

### Add Keybinding

Add a keybinding in your WM config to run `plauder`:

| WM/DE | Config | Example |
|-------|--------|---------|
| sxhkd | `~/.config/sxhkd/sxhkdrc` | `super + r` <br> `    plauder` |
| Hyprland | `~/.config/hypr/hyprland.conf` | `bind = SUPER, R, exec, plauder` |
| i3/sway | `~/.config/i3/config` | `bindsym $mod+r exec plauder` |
| dwm | `config.h` | `{ MODKEY, XK_r, spawn, SHCMD("plauder") }` |

## Usage

1. Start the daemon: `systemctl --user start plauder`
2. Press your keybind to start recording
3. Speak
4. Press keybind again to stop and transcribe
5. Text appears in your focused window

### Tray Menu (right-click)

- **Toggle Recording** - Start/stop recording
- **Einstellungen & Historie** - Open GUI for settings, logs, and recording history
- **Select Microphone** - Choose input device
- **Select Language** - Set transcription language (50+ languages)
- **Quit** - Stop the daemon

### GUI Features

Open the Tauri + React GUI from the tray menu to access:
- **📝 Recording History** - Searchable, expandable cards showing Whisper raw output, LLM formatted output, and an editable correction field
- **✏️ Corrections** - Teach the system by correcting misheard words
- **🪲 Debug Logs** - Live-tailing logs for troubleshooting
- **⚙️ Settings** - Configure API key, language, microphone, system prompt

Stack: **Tauri 2 + React 19 + Vite + TypeScript + Tailwind v4**, dark UI by default.

## Development

The GUI is a Tauri 2 app — React/Vite frontend in `src/`, Rust backend in `src-tauri/`.

```bash
pnpm install          # install frontend deps
pnpm tauri dev        # hot-reload dev window
pnpm tauri build      # release binary -> src-tauri/target/release/plauder-gui
```

The Rust backend exposes commands (`get_recordings`, `save_settings`, …) over Tauri
IPC; the frontend calls them through `src/lib/api.ts`. Data lives in the same
`history.db` and `.env` that `voice-input.sh` uses.

## Supported Languages

Auto-detect, English, German, Spanish, French, Hindi, Italian, Portuguese, Dutch, Polish, Russian, Chinese, Japanese, Korean, Arabic, Turkish, Vietnamese, Thai, Indonesian, Ukrainian, Czech, Greek, Hebrew, Hungarian, Swedish, Danish, Finnish, Norwegian, Romanian, Bengali, Tamil, Telugu, Urdu, Persian, and many more.

## How It Works

```
Keybind → Start recording (16kHz mono WAV)
Keybind → Stop → Compress to Opus (~30x smaller)
       → Upload to Groq Whisper API
       → Format with Groq LLM (punctuation, caps)
       → Pastes into focused window (Ctrl+V)
```

## Files

After installation:
```
~/.local/share/plauder/
├── plauder-gui           # Rust GUI binary (settings, history, logs)
├── voice-input.sh          # Main toggle script
├── voice-input-daemon.sh   # Tray daemon
├── select-mic.sh           # Microphone selector
├── select-language.sh      # Language selector
├── .env                    # Your config (API key, language, mic)
├── history.db              # SQLite database for recordings
└── icons/                  # Tray icons

~/.local/bin/plauder      # Symlink to run the tool
```

## Commands

```bash
plauder                           # Toggle recording
systemctl --user start plauder    # Start daemon
systemctl --user stop plauder     # Stop daemon
systemctl --user status plauder   # Check status
journalctl --user -u plauder -f   # View logs
```

## Uninstall

```bash
systemctl --user stop plauder
systemctl --user disable plauder
rm -rf ~/.local/share/plauder ~/.local/bin/plauder
rm ~/.config/systemd/user/plauder.service
```

## Troubleshooting

### No tray icon
- Install `yad`: `sudo pacman -S yad`
- Make sure you have a system tray

### Transcription errors
- Set specific language in tray menu (auto-detect can miss)
- Speak clearly, reduce background noise
- Check microphone selection

### Slow processing
- Mostly upload time to Groq API
- Keep recordings under 30 seconds for <5s processing

## License

MIT

## Credits

- [Groq](https://groq.com) - Fast Whisper API
- [OpenAI Whisper](https://github.com/openai/whisper) - Speech recognition model
