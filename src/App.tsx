import { useEffect, useState } from "react";
import {
  History,
  ScrollText,
  Settings as SettingsIcon,
  Replace,
  RotateCw,
  Mic,
  Square,
} from "lucide-react";
import { api } from "@/lib/api";
import { useStore } from "@/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HistoryTab } from "@/components/HistoryTab";
import { LogsTab } from "@/components/LogsTab";
import { SettingsTab } from "@/components/SettingsTab";
import { CorrectionsTab } from "@/components/CorrectionsTab";

export default function App() {
  const refreshAll = useStore((s) => s.refreshAll);
  const refreshHistory = useStore((s) => s.refreshHistory);
  const loading = useStore((s) => s.loading);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    refreshAll().catch(console.error);
  }, [refreshAll]);

  useEffect(() => {
    let busy = false;
    const id = setInterval(async () => {
      if (busy) return; // skip if the previous tick is still running
      busy = true;
      try {
        await refreshHistory();
        setRecording(await api.isRecording());
      } catch {
        /* ignore */
      } finally {
        busy = false;
      }
    }, 1500);
    return () => clearInterval(id);
  }, [refreshHistory]);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Mic className="size-4" />
        </div>
        <h1 className="text-sm font-semibold">Plauder</h1>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" />
          live
        </span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant={recording ? "destructive" : "default"}
          onClick={() => api.toggleRecording().catch(console.error)}
          title="Aufnahme starten/stoppen"
        >
          {recording ? (
            <>
              <Square className="fill-current" /> Aufnahme läuft…
            </>
          ) : (
            <>
              <Mic /> Aufnehmen
            </>
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => refreshAll()}
          title="Jetzt aktualisieren"
        >
          <RotateCw />
        </Button>
      </header>

      {/* Body */}
      <Tabs
        defaultValue="history"
        className="flex flex-1 flex-col overflow-hidden p-3"
      >
        <TabsList className="self-start">
          <TabsTrigger value="history">
            <History /> Verlauf
          </TabsTrigger>
          <TabsTrigger value="corrections">
            <Replace /> Korrekturen
          </TabsTrigger>
          <TabsTrigger value="logs">
            <ScrollText /> Logs
          </TabsTrigger>
          <TabsTrigger value="settings">
            <SettingsIcon /> Einstellungen
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden pt-1">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <>
              <TabsContent value="history" className="h-full">
                <HistoryTab />
              </TabsContent>
              <TabsContent value="corrections" className="h-full">
                <CorrectionsTab />
              </TabsContent>
              <TabsContent value="logs" className="h-full">
                <LogsTab />
              </TabsContent>
              <TabsContent value="settings" className="h-full">
                <SettingsTab />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
