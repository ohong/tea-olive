'use client';

import { FormEvent, useMemo, useState } from 'react';

import { HashbrownSummary } from '@/components/HashbrownSummary';
import { providerMetadata, type ProviderId } from '@/lib/providers';
import type { ApiCheckResponse, ApiCheckSuccess } from '@/types/check';

const providerEntries = Object.entries(providerMetadata) as Array<[
  ProviderId,
  { label: string; defaultModel: string }
]>;

export default function HomePage() {
  const [provider, setProvider] = useState<ProviderId>('openai');
  const [prompt, setPrompt] = useState(
    'Give me a one sentence update proving this API key is active right now.',
  );
  const [result, setResult] = useState<ApiCheckSuccess | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerLabel = useMemo(() => providerMetadata[provider].label, [provider]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, prompt }),
      });

      const json = (await response.json()) as ApiCheckResponse;
      if (!response.ok || !json.success) {
        const message = json.success ? `Request failed with status ${response.status}` : json.error;
        setError(message);
        setResult(null);
        return;
      }

      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error while reaching server');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 px-6 py-10">
      <header className="flex flex-col gap-4 text-balance text-center sm:text-left">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Tea Olive</h1>
        <p className="text-base text-white/70">
          Run a quick prompt against OpenAI, Claude, or Gemini to confirm their API keys still work.
          Inspect the raw payloads like you would in Postman, then let Hashbrown craft a friendly
          summary for you.
        </p>
      </header>

      <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-xl ring-1 ring-white/5">
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-[200px_1fr] sm:items-center">
            <label className="text-sm font-medium text-white/80" htmlFor="service">
              Service
            </label>
            <select
              id="service"
              value={provider}
              onChange={(event) => setProvider(event.target.value as ProviderId)}
              className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {providerEntries.map(([id, meta]) => (
                <option key={id} value={id}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3">
            <label className="text-sm font-medium text-white/80" htmlFor="prompt">
              Prompt
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Ask the provider to prove your API key works."
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? 'Checking...' : 'Run check'}
          </button>

          {error ? (
            <div className="rounded-lg border border-rose-500/60 bg-rose-500/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
        </form>

        {result ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <header className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold text-white/90">Run details</h2>
                <p className="text-sm text-white/60">
                  HTTP status {result.status} - {result.durationMs.toLocaleString()} ms - Model{' '}
                  {result.modelUsed}
                </p>
              </header>
              <div className="rounded-lg bg-black/40 p-4 text-sm text-white/80">
                <p className="font-medium text-white/70">Prompt</p>
                <p className="mt-1 whitespace-pre-wrap text-white/90">{result.prompt}</p>
              </div>
              {result.textOutput ? (
                <div className="rounded-lg bg-black/40 p-4 text-sm text-white/80">
                  <p className="font-medium text-white/70">Model output</p>
                  <p className="mt-1 whitespace-pre-wrap text-white/90">{result.textOutput}</p>
                </div>
              ) : null}
            </section>

            <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold text-white/90">Raw payloads</h2>
              <PayloadBlock label="Request" data={result.requestPayload} />
              <PayloadBlock label="Response" data={result.responsePayload} />
            </section>
          </div>
        ) : null}
      </section>

      <section>
        <HashbrownSummary provider={provider} providerLabel={providerLabel} result={result} />
      </section>
    </main>
  );
}

function PayloadBlock({ label, data }: { label: string; data: unknown }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-white/70">{label}</p>
      <pre className="max-h-72 overflow-auto rounded-xl bg-black/60 p-4 text-xs leading-relaxed text-emerald-200">
        {safeJson(data)}
      </pre>
    </div>
  );
}

function safeJson(data: unknown) {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return `Unable to serialise payload: ${error instanceof Error ? error.message : 'unknown error'}`;
  }
}
