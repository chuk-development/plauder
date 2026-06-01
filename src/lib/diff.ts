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

/** Cheap change estimate (0-100 %) for the list badge — does NOT run the
 *  O(n*m) word diff, so it stays fast across hundreds of rows on every refresh.
 *
 *  Character-multiset Jaccard distance: captures case changes, punctuation,
 *  whitespace, and additions/removals. The previous word-only version reported
 *  0 % whenever the LLM only re-cased words or added punctuation. */
export function diffPercent(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0 && bl === 0) return 0;
  if (al === 0 || bl === 0) return 100;

  const ca = new Map<string, number>();
  const cb = new Map<string, number>();
  for (const ch of a) ca.set(ch, (ca.get(ch) ?? 0) + 1);
  for (const ch of b) cb.set(ch, (cb.get(ch) ?? 0) + 1);

  let common = 0;
  let total = 0;
  const keys = new Set<string>([...ca.keys(), ...cb.keys()]);
  for (const k of keys) {
    const x = ca.get(k) ?? 0;
    const y = cb.get(k) ?? 0;
    common += Math.min(x, y);
    total += Math.max(x, y);
  }
  if (total === 0) return 0;
  // Floor at 1 % whenever the two strings are not byte-identical, so that
  // any visible change shows up in the badge instead of rounding to 0.
  const pct = (1 - common / total) * 100;
  return pct > 0 && pct < 1 ? 1 : Math.round(pct);
}

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
