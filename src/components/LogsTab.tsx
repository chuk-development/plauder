import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, RotateCw } from "lucide-react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";

const PAGE = 100;

export function LogsTab() {
  const logs = useStore((s) => s.logs);
  const refreshLogs = useStore((s) => s.refreshLogs);
  const clearLogs = useStore((s) => s.clearLogs);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(PAGE);

  // Live-tail while the tab is mounted. Throttle with a busy flag so a slow
  // tick can't pile up requests.
  useEffect(() => {
    let busy = false;
    const id = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        await refreshLogs();
      } finally {
        busy = false;
      }
    }, 1500);
    return () => clearInterval(id);
  }, [refreshLogs]);

  const lines = useMemo(() => (logs ? logs.split("\n") : []), [logs]);
  const total = lines.length;
  const visible = useMemo(
    () => lines.slice(Math.max(0, total - limit)).join("\n"),
    [lines, total, limit]
  );
  const hasMore = limit < total;

  // Auto-scroll to bottom when new content arrives — only if the user is
  // already near the bottom, so scrolling up to read older lines isn't yanked.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) bottomRef.current?.scrollIntoView();
  }, [visible]);

  // Reset to last PAGE lines whenever the buffer is cleared.
  useEffect(() => {
    if (total === 0) setLimit(PAGE);
  }, [total]);

  // Auto-load older chunks when the user scrolls near the top — same UX as
  // the Verlauf tab. Preserve the scroll position so the view doesn't jump
  // after the older block is inserted above.
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop < 80 && hasMore) {
      const prevHeight = el.scrollHeight;
      setLimit((l) => Math.min(total, l + PAGE));
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop =
            scrollRef.current.scrollHeight - prevHeight + el.scrollTop;
        }
      });
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Debug log · live · {Math.min(limit, total)}/{total} Zeilen
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

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto rounded-lg border bg-background/60 p-3"
      >
        {hasMore && (
          <p className="mb-2 text-center text-[10px] text-muted-foreground/70">
            Nach oben scrollen für ältere Zeilen ({total - limit} übrig)
          </p>
        )}
        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground/70 select-text">
          {visible}
        </pre>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
