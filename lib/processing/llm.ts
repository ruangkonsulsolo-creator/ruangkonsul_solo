import "server-only";

/**
 * Klien minimal Anthropic Messages API (tanpa SDK).
 * Env:
 *   ANTHROPIC_API_KEY            — wajib untuk parafrase & AI checker berbasis model
 *   ANTHROPIC_MODEL_PARAPHRASE   — default "claude-sonnet-5-5"
 *   ANTHROPIC_MODEL_DETECT       — default "claude-haiku-5-5"
 */
export const llmAvailable = () => !!process.env.ANTHROPIC_API_KEY;

export class LlmError extends Error {}

export async function callClaude(opts: {
  system: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new LlmError("ANTHROPIC_API_KEY belum di-set.");

  const body = JSON.stringify({
    model: opts.model ?? "claude-sonnet-5-5",
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });

  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body,
      cache: "no-store",
    });

    if (res.ok) {
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      return (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    }

    lastErr = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;
    // Retry untuk rate limit / overload / server error
    if (res.status === 429 || res.status === 529 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1) ** 2));
      continue;
    }
    break;
  }
  throw new LlmError(`Claude API gagal — ${lastErr}`);
}

/** Ambil blok JSON pertama dari jawaban model. */
export function parseJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.search(/[[{]/);
  const end = Math.max(raw.lastIndexOf("]"), raw.lastIndexOf("}"));
  if (start < 0 || end < start) throw new LlmError("Respons model bukan JSON.");
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

/** Jalankan tugas async dengan batas konkurensi. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}
