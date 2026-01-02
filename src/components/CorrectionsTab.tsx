import { useState } from "react";
import { ArrowRight, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { type Correction } from "@/lib/api";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function CorrectionRow({ c }: { c: Correction }) {
  const editCorrection = useStore((s) => s.editCorrection);
  const deleteCorrection = useStore((s) => s.deleteCorrection);
  const [editing, setEditing] = useState(false);
  const [from, setFrom] = useState(c.whisperPattern);
  const [to, setTo] = useState(c.intendedText);

  const save = async () => {
    if (!from.trim() || !to.trim()) return;
    await editCorrection(c.id, from.trim(), to.trim());
    setEditing(false);
  };

  const cancel = () => {
    setFrom(c.whisperPattern);
    setTo(c.intendedText);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-card px-2 py-1.5">
        <Input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          className="h-7 flex-1 text-xs"
        />
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/60" />
        <Input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          className="h-7 flex-1 text-xs"
        />
        <button
          onClick={save}
          className="shrink-0 rounded-md p-1 text-primary hover:bg-accent"
          title="Speichern"
        >
          <Check className="size-3.5" />
        </button>
        <button
          onClick={cancel}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent"
          title="Abbrechen"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-xs">
      <span className="flex-1 truncate text-muted-foreground">
        “{c.whisperPattern}”
      </span>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/60" />
      <span className="flex-1 truncate text-primary">“{c.intendedText}”</span>
      <button
        onClick={() => setEditing(true)}
        className="shrink-0 text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        title="Bearbeiten"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        onClick={() => deleteCorrection(c.id)}
        className="shrink-0 text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        title="Löschen"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

export function CorrectionsTab() {
  const corrections = useStore((s) => s.corrections);
  const addCorrection = useStore((s) => s.addCorrection);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const canAdd = from.trim() && to.trim();

  const submit = async () => {
    if (!canAdd) return;
    await addCorrection(from.trim(), to.trim());
    setFrom("");
    setTo("");
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Bekannte Verhörer beibringen. Der Formatter ersetzt den falsch gehörten
        Begriff durch den gewünschten — z. B. „Cloud“ → „Claude“.
      </p>

      <div className="flex items-end gap-2 rounded-lg border bg-card p-3">
        <div className="flex-1 space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Gehört als
          </span>
          <Input
            placeholder="Cloud"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <ArrowRight className="mb-2.5 size-4 shrink-0 text-muted-foreground/60" />
        <div className="flex-1 space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Gemeint
          </span>
          <Input
            placeholder="Claude"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <Button onClick={submit} disabled={!canAdd} className="mb-0">
          <Plus /> Hinzufügen
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {corrections.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Noch keine Korrekturen
          </div>
        ) : (
          corrections.map((c) => <CorrectionRow key={c.id} c={c} />)
        )}
      </div>
    </div>
  );
}
