import { useEffect, useRef } from "react";
import { Trash2, RotateCw } from "lucide-react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";

export function LogsTab() {
  const logs = useStore((s) => s.logs);
  const refreshLogs = useStore((s) => s.refreshLogs);
  const clearLogs = useStore((s) => s.clearLogs);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Live-tail: poll the debug log while this tab is mounted.
  useEffect(() => {
    const id = setInterval(refreshLogs, 1500);
    return () => clearInterval(id);
  }, [refreshLogs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [logs]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Debug log · live
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refreshLogs}>
            <RotateCw /> Refresh
          </Button>
          <Button size="sm" variant="destructive" onClick={clearLogs}>
            <Trash2 /> Clear
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border bg-background/60 p-3">
        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground/70 select-text">
          {logs}
        </pre>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
