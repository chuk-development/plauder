export type DiffOp = "equal" | "insert" | "delete";

export interface DiffToken {
  op: DiffOp;
  text: string;
}

function tokenize(s: string): string[] {
  return s.match(/\s+|[^\s]+/g) ?? [];
}

export function wordDiff(a: string, b: string): DiffToken[] {
  const at = tokenize(a);
  const bt = tokenize(b);
  const n = at.length;
  const m = bt.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        at[i] === bt[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffToken[] = [];
  let i = 0;
  let j = 0;
  const push = (op: DiffOp, text: string) => {
    const last = out[out.length - 1];
    if (last && last.op === op) last.text += text;
    else out.push({ op, text });
  };
  while (i < n && j < m) {
    if (at[i] === bt[j]) {
      push("equal", at[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("delete", at[i]);
      i++;
    } else {
      push("insert", bt[j]);
      j++;
    }
  }
  while (i < n) push("delete", at[i++]);
  while (j < m) push("insert", bt[j++]);
  return out;
}

const REFUSAL_PATTERNS = [
  "kann ich nicht",
  "i cannot",
  "i can't",
  "as an ai",
  "als ki",
  "sprachmodell",
  "language model",
  "ich bin ein",
  "entschuldigung, aber",
  "i'm sorry",
  "hier ist der",
  "hier ist die",
  "bitte gib mir",
  "what would you like",
  "was möchtest du",
];

export type AnomalyKind = "refusal" | "truncated" | "inflated" | null;

export function detectAnomaly(
  whisper: string | null,
  llm: string | null
): AnomalyKind {
  if (!whisper || !llm) return null;
  const w = whisper.trim();
  const l = llm.trim();
  if (w.length < 8) return null;

  const lower = l.toLowerCase();
  if (REFUSAL_PATTERNS.some((p) => lower.includes(p))) return "refusal";

  if (w.length > 40 && l.length < w.length * 0.6) return "truncated";
  if (w.length > 20 && l.length > w.length * 1.8) return "inflated";

  return null;
}

export function anomalyLabel(kind: AnomalyKind): string {
  switch (kind) {
    case "refusal":
      return "Mögliche KI-Antwort statt Formatierung";
    case "truncated":
      return "Output stark gekürzt — evtl. abgeschnitten";
    case "inflated":
      return "Output viel länger — evtl. dazugedichtet";
    default:
      return "";
  }
}
