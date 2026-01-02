import { useMemo, useState } from "react";
import {
  ChevronRight,
  Check,
  Trash2,
  Save,
  Search,
  AlertCircle,
  AlertTriangle,
  Copy,
  CheckCheck,
  Clock,
  Mic,
  Zap,
  GitCompare,
} from "lucide-react";
import { type Recording } from "@/lib/api";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";
import { wordDiff, detectAnomaly, anomalyLabel } from "@/lib/diff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function relativeTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "?";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "gerade eben";
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std`;
  if (diff < 172800) return "gestern";
  if (diff < 604800) return `vor ${Math.floor(diff / 86400)} Tagen`;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
}

function absoluteTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function wordCount(s: string | null): number {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      title="Kopieren"
      className={cn(
        "shrink-0 rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground",
        copied && "text-primary"
      )}
    >
      {copied ? <CheckCheck className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function DiffView({ whisper, llm }: { whisper: string; llm: string }) {
  const tokens = useMemo(() => wordDiff(whisper, llm), [whisper, llm]);
  return (
    <p className="whitespace-pre-wrap break-words rounded-lg bg-background/50 p-2.5 text-xs leading-relaxed select-text">
      {tokens.map((t, i) => {
        if (t.op === "equal")
          return (
            <span key={i} className="text-foreground/60">
              {t.text}
            </span>
          );
        if (t.op === "delete")
          return (
            <span
              key={i}
              className="rounded bg-destructive/20 text-destructive/90 line-through decoration-destructive/50"
            >
              {t.text}
            </span>
          );
        return (
          <span key={i} className="rounded bg-primary/20 text-primary">
            {t.text}
          </span>
        );
      })}
    </p>
  );
}

function RecordingCard({ rec }: { rec: Recording }) {
  const [expanded, setExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const saveCorrection = useStore((s) => s.saveCorrection);
  const deleteRecording = useStore((s) => s.deleteRecording);
  const text = rec.llmOutput || rec.whisperOutput || "";
  const preview = text || "(leer)";
  const [draft, setDraft] = useState(rec.userCorrection || rec.llmOutput || "");
  const anomaly = useMemo(
    () => detectAnomaly(rec.whisperOutput, rec.llmOutput),
    [rec.whisperOutput, rec.llmOutput]
  );
  const canDiff = !!(rec.whisperOutput && rec.llmOutput);

  return (
    <div
      className={cn(
        "group rounded-xl border bg-card transition-all",
        expanded
          ? "border-primary/30 shadow-lg shadow-black/20"
          : "hover:border-white/20 hover:bg-card/80",
        anomaly && !expanded && "border-amber-500/30"
      )}
    >
      <div
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left"
      >
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground/50 transition-transform",
            expanded && "rotate-90 text-primary"
          )}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm text-foreground/90",
              expanded ? "line-clamp-none" : "truncate"
            )}
          >
            {preview}
          </p>
          {!expanded && (
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{relativeTime(rec.timestamp)}</span>
              {wordCount(text) > 0 && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{wordCount(text)} Wörter</span>
                </>
              )}
              {anomaly && (
                <span className="inline-flex items-center gap-0.5 text-amber-500">
                  <AlertTriangle className="size-3" /> auffällig
                </span>
              )}
              {rec.userCorrection && (
                <span className="inline-flex items-center gap-0.5 text-primary">
                  <Check className="size-3" /> korrigiert
                </span>
              )}
              {!rec.success && (
                <span className="inline-flex items-center gap-0.5 text-destructive">
                  <AlertCircle className="size-3" /> Fehler
                </span>
              )}
            </div>
          )}
        </div>
        {!expanded && text && <CopyButton text={text} />}
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-white/5 px-3 pb-3 pt-3">
          {anomaly && (
            <p className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs text-amber-500">
              <AlertTriangle className="size-3.5 shrink-0" />
              {anomalyLabel(anomaly)}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span title={absoluteTime(rec.timestamp)}>
              {absoluteTime(rec.timestamp)}
            </span>
            {rec.totalDurationMs > 0 && (
              <>
                <Badge icon={<Clock className="size-3" />}>
                  {(rec.totalDurationMs / 1000).toFixed(1)}s
                </Badge>
                <Badge icon={<Mic className="size-3" />}>
                  {rec.whisperDurationMs}ms
                </Badge>
                <Badge icon={<Zap className="size-3" />}>
                  {rec.llmDurationMs}ms
                </Badge>
              </>
            )}
            {canDiff && (
              <button
                onClick={() => setShowDiff((d) => !d)}
                className={cn(
                  "ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors hover:bg-accent",
                  showDiff ? "bg-accent text-foreground" : "text-muted-foreground"
                )}
              >
                <GitCompare className="size-3" />
                {showDiff ? "Diff aus" : "Diff zeigen"}
              </button>
            )}
          </div>

          <Field
            label="Whisper (roh)"
            action={rec.whisperOutput && <CopyButton text={rec.whisperOutput} />}
          >
            <p className="whitespace-pre-wrap break-words rounded-lg bg-background/50 p-2.5 text-xs leading-relaxed text-foreground/60 select-text">
              {rec.whisperOutput || "—"}
            </p>
          </Field>

          {showDiff && canDiff ? (
            <Field label="Änderungen (Whisper → Formatiert)">
              <DiffView whisper={rec.whisperOutput!} llm={rec.llmOutput!} />
              <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block size-2 rounded-sm bg-destructive/40" />
                  entfernt
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block size-2 rounded-sm bg-primary/40" />
                  hinzugefügt
                </span>
              </div>
            </Field>
          ) : (
            <Field
              label="Formatiert (eingefügt)"
              action={rec.llmOutput && <CopyButton text={rec.llmOutput} />}
            >
              <p className="whitespace-pre-wrap break-words rounded-lg bg-background/50 p-2.5 text-xs leading-relaxed text-foreground/90 select-text">
                {rec.llmOutput || "—"}
              </p>
            </Field>
          )}

          <Field label="Korrektur">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Korrigierten Text eingeben, um das System zu trainieren…"
              className="min-h-[64px] text-xs leading-relaxed"
            />
          </Field>

          {rec.errorMessage && (
            <p className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
              <AlertCircle className="size-3.5 shrink-0" /> {rec.errorMessage}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => saveCorrection(rec.id, draft)}
              disabled={!draft.trim() || draft === (rec.userCorrection ?? "")}
            >
              <Save /> Korrektur speichern
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteRecording(rec.id)}
            >
              <Trash2 /> Löschen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-accent/50 px-1.5 py-0.5 font-mono">
      {icon}
      {children}
    </span>
  );
}

function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col rounded-lg border bg-card px-3 py-1.5">
      <span className="text-sm font-semibold text-foreground">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function HistoryTab() {
  const recordings = useStore((s) => s.recordings);
  const [query, setQuery] = useState("");
  const [onlyAnomalies, setOnlyAnomalies] = useState(false);

  const stats = useMemo(() => {
    const total = recordings.length;
    const words = recordings.reduce(
      (n, r) => n + wordCount(r.llmOutput || r.whisperOutput),
      0
    );
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = recordings.filter(
      (r) => new Date(r.timestamp).getTime() >= todayStart.getTime()
    ).length;
    const anomalies = recordings.filter((r) =>
      detectAnomaly(r.whisperOutput, r.llmOutput)
    ).length;
    return { total, words, today, anomalies };
  }, [recordings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = recordings;
    if (q)
      list = list.filter(
        (r) =>
          r.whisperOutput?.toLowerCase().includes(q) ||
          r.llmOutput?.toLowerCase().includes(q) ||
          r.userCorrection?.toLowerCase().includes(q)
      );
    if (onlyAnomalies)
      list = list.filter((r) => detectAnomaly(r.whisperOutput, r.llmOutput));
    return list;
  }, [recordings, query, onlyAnomalies]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex gap-2">
        <StatPill label="Aufnahmen" value={stats.total} />
        <StatPill label="Wörter total" value={stats.words.toLocaleString()} />
        <StatPill label="Heute" value={stats.today} />
        <button
          onClick={() => setOnlyAnomalies((v) => !v)}
          className={cn(
            "flex flex-col rounded-lg border px-3 py-1.5 text-left transition-colors",
            onlyAnomalies
              ? "border-amber-500/50 bg-amber-500/10"
              : "bg-card hover:border-amber-500/30"
          )}
          title="Nur auffällige zeigen"
        >
          <span
            className={cn(
              "text-sm font-semibold",
              stats.anomalies > 0 ? "text-amber-500" : "text-foreground"
            )}
          >
            {stats.anomalies}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Auffällig
          </span>
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Transkriptionen durchsuchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
        {(query || onlyAnomalies) && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {filtered.length}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mic className="size-8 opacity-20" />
            {recordings.length === 0 ? "Noch keine Aufnahmen" : "Keine Treffer"}
          </div>
        ) : (
          filtered.map((rec) => <RecordingCard key={rec.id} rec={rec} />)
        )}
      </div>
    </div>
  );
}
