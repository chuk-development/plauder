import { invoke } from "@tauri-apps/api/core";

export interface Recording {
  id: number;
  timestamp: string;
  whisperOutput: string | null;
  llmOutput: string | null;
  userCorrection: string | null;
  audioDurationMs: number;
  whisperDurationMs: number;
  llmDurationMs: number;
  totalDurationMs: number;
  success: boolean;
  errorMessage: string | null;
}

export interface Correction {
  id: number;
  whisperPattern: string;
  intendedText: string;
  createdAt: string;
}

export interface Settings {
  apiKey: string;
  micSource: string;
  language: string;
  notifications: boolean;
  trayIcon: boolean;
  systemPrompt: string;
}

export const api = {
  getRecordings: () => invoke<Recording[]>("get_recordings"),
  getCorrections: () => invoke<Correction[]>("get_corrections"),
  addCorrection: (whisperPattern: string, intendedText: string) =>
    invoke<void>("add_correction", { whisperPattern, intendedText }),
  editCorrection: (id: number, whisperPattern: string, intendedText: string) =>
    invoke<void>("edit_correction", { id, whisperPattern, intendedText }),
  deleteCorrection: (id: number) => invoke<void>("delete_correction", { id }),
  saveCorrection: (id: number, text: string) =>
    invoke<void>("save_correction", { id, text }),
  deleteRecording: (id: number) => invoke<void>("delete_recording", { id }),
  getLogs: () => invoke<string>("get_logs"),
  clearLogs: () => invoke<void>("clear_logs"),
  getSettings: () => invoke<Settings>("get_settings"),
  saveSettings: (settings: Settings) =>
    invoke<void>("save_settings", { settings }),
  getDefaultPrompt: () => invoke<string>("get_default_prompt"),
  toggleRecording: () => invoke<void>("toggle_recording"),
  listMics: () => invoke<MicSource[]>("list_mics"),
  isRecording: () => invoke<boolean>("is_recording"),
};

export interface MicSource {
  id: string;
  label: string;
}
