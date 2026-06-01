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
    // Only replace state if something actually changed, so the live poll
    // doesn't trigger a full re-render (and diff recompute) every second.
    const prev = get();
    const sameRec =
      prev.recordings.length === recordings.length &&
      prev.recordings[0]?.id === recordings[0]?.id &&
      prev.recordings[0]?.llmOutput === recordings[0]?.llmOutput &&
      prev.recordings[0]?.userCorrection === recordings[0]?.userCorrection;
    const sameCorr =
      prev.corrections.length === corrections.length &&
      prev.corrections[0]?.id === corrections[0]?.id;
    if (sameRec && sameCorr) return;
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
