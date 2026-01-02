import { create } from "zustand";
import { api, type Correction, type Recording, type Settings } from "@/lib/api";

interface AppState {
  recordings: Recording[];
  corrections: Correction[];
  logs: string;
  settings: Settings | null;
  defaultPrompt: string;
  loading: boolean;

  refreshAll: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  saveCorrection: (id: number, text: string) => Promise<void>;
  addCorrection: (whisperPattern: string, intendedText: string) => Promise<void>;
  editCorrection: (
    id: number,
    whisperPattern: string,
    intendedText: string
  ) => Promise<void>;
  deleteCorrection: (id: number) => Promise<void>;
  deleteRecording: (id: number) => Promise<void>;
  clearLogs: () => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  recordings: [],
  corrections: [],
  logs: "",
  settings: null,
  defaultPrompt: "",
  loading: true,

  refreshAll: async () => {
    const [recordings, corrections, logs, settings, defaultPrompt] =
      await Promise.all([
        api.getRecordings(),
        api.getCorrections(),
        api.getLogs(),
        api.getSettings(),
        api.getDefaultPrompt(),
      ]);
    set({ recordings, corrections, logs, settings, defaultPrompt, loading: false });
  },

  refreshHistory: async () => {
    const [recordings, corrections] = await Promise.all([
      api.getRecordings(),
      api.getCorrections(),
    ]);
    set({ recordings, corrections });
  },

  refreshLogs: async () => set({ logs: await api.getLogs() }),

  saveCorrection: async (id, text) => {
    await api.saveCorrection(id, text);
    await get().refreshHistory();
  },

  addCorrection: async (whisperPattern, intendedText) => {
    await api.addCorrection(whisperPattern, intendedText);
    set({ corrections: await api.getCorrections() });
  },

  editCorrection: async (id, whisperPattern, intendedText) => {
    await api.editCorrection(id, whisperPattern, intendedText);
    set({ corrections: await api.getCorrections() });
  },

  deleteCorrection: async (id) => {
    await api.deleteCorrection(id);
    set({ corrections: await api.getCorrections() });
  },

  deleteRecording: async (id) => {
    await api.deleteRecording(id);
    await get().refreshHistory();
  },

  clearLogs: async () => {
    await api.clearLogs();
    set({ logs: "" });
  },

  saveSettings: async (settings) => {
    await api.saveSettings(settings);
    set({ settings });
  },
}));
