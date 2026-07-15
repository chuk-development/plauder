import { useEffect, useState } from "react";
import { RotateCcw, Save, RefreshCw, Eye, EyeOff } from "lucide-react";
import { api, type MicSource, type Settings } from "@/lib/api";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const LANGUAGES: { code: string; name: string }[] = [
  { code: "", name: "Auto-Erkennung" },
  { code: "de", name: "Deutsch" },
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "nl", name: "Nederlands" },
  { code: "pl", name: "Polski" },
  { code: "ru", name: "Русский" },
  { code: "uk", name: "Українська" },
  { code: "tr", name: "Türkçe" },
  { code: "ar", name: "العربية" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "hi", name: "हिन्दी" },
];

export function SettingsTab() {
  const settings = useStore((s) => s.settings);
  const defaultPrompt = useStore((s) => s.defaultPrompt);
  const saveSettings = useStore((s) => s.saveSettings);

  const [draft, setDraft] = useState<Settings | null>(settings);
  const [saved, setSaved] = useState(false);
  const [mics, setMics] = useState<MicSource[]>([]);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => setDraft(settings), [settings]);

  const loadMics = () => api.listMics().then(setMics).catch(() => {});
  useEffect(() => {
    loadMics();
  }, []);

  if (!draft) return null;

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft({ ...draft, [key]: value });

  const onSave = async () => {
    await saveSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  // If the saved mic isn't in the detected list (device unplugged), keep it as an option.
  const micKnown = mics.some((m) => m.id === draft.micSource);
  const langKnown = LANGUAGES.some((l) => l.code === draft.language);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        <Section title="API">
          <div className="space-y-1.5">
            <Label htmlFor="api">Groq API-Key</Label>
            <div className="relative">
              <Input
                id="api"
                type={showKey ? "text" : "password"}
                placeholder="gsk_…"
                value={draft.apiKey}
                onChange={(e) => update("apiKey", e.target.value)}
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? "Key verbergen" : "Key zeigen"}
                title={showKey ? "Key verbergen" : "Key zeigen"}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </Section>

        <Section
          title="Aufnahme"
          action={
            <Button size="sm" variant="ghost" onClick={loadMics}>
              <RefreshCw /> Mics neu laden
            </Button>
          }
        >
          <div className="space-y-1.5">
            <Label htmlFor="mic">Mikrofon</Label>
            <select
              id="mic"
              value={draft.micSource}
              onChange={(e) => update("micSource", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {mics.map((m) => (
                <option key={m.id || "default"} value={m.id} className="bg-popover">
                  {m.label}
                </option>
              ))}
              {!micKnown && draft.micSource && (
                <option value={draft.micSource} className="bg-popover">
                  {draft.micSource} (nicht verbunden)
                </option>
              )}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lang">Sprache</Label>
            <select
              id="lang"
              value={draft.language}
              onChange={(e) => update("language", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code || "auto"} value={l.code} className="bg-popover">
                  {l.name}
                </option>
              ))}
              {!langKnown && draft.language && (
                <option value={draft.language} className="bg-popover">
                  {draft.language}
                </option>
              )}
            </select>
          </div>
        </Section>

        <Section title="Vokabular">
          <div className="space-y-1.5">
            <Label htmlFor="vocab">Eigene Begriffe</Label>
            <Textarea
              id="vocab"
              value={draft.vocabulary}
              onChange={(e) => update("vocabulary", e.target.value)}
              placeholder="Higgsfield, Claude Code, Flutter, Subagent, …"
              className="min-h-[70px] font-mono text-[11px] leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              Namen und Fachbegriffe, die Whisper verhaut — kommagetrennt. Gehen direkt an die
              Erkennung, nicht erst an die Nachbearbeitung. Weitere Begriffe lernt Plauder
              selbst aus dem Verlauf dazu.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model">Modell für die Nachbearbeitung</Label>
            <Input
              id="model"
              value={draft.llmModel}
              onChange={(e) => update("llmModel", e.target.value)}
              placeholder="openai/gpt-oss-120b"
              className="font-mono text-xs"
            />
          </div>
        </Section>

        <Section title="Oberfläche">
          <Toggle
            label="Benachrichtigungen"
            checked={draft.notifications}
            onChange={(v) => update("notifications", v)}
          />
          <Toggle
            label="Tray-Icon"
            checked={draft.trayIcon}
            onChange={(v) => update("trayIcon", v)}
          />
        </Section>

        <Section
          title="System-Prompt"
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => update("systemPrompt", defaultPrompt)}
            >
              <RotateCcw /> Zurücksetzen
            </Button>
          }
        >
          <Textarea
            value={draft.systemPrompt}
            onChange={(e) => update("systemPrompt", e.target.value)}
            className="min-h-[180px] font-mono text-[11px] leading-relaxed"
          />
        </Section>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t pt-3">
        <Button onClick={onSave}>
          <Save /> Einstellungen speichern
        </Button>
        {saved && <span className="text-xs text-primary">Gespeichert ✓</span>}
      </div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
