'use client';

import { useEffect, useMemo, useRef } from 'react';
import { s } from '@hashbrownai/core';
import { exposeComponent, HashbrownProvider, useUiChat } from '@hashbrownai/react';

import type { ProviderId } from '@/lib/providers';
import { providerMetadata } from '@/lib/providers';
import type { ApiCheckSuccess } from '@/types/check';

import { KeyValueList } from './hashbrown/KeyValueList';
import { Note } from './hashbrown/Note';
import { SummaryCard } from './hashbrown/SummaryCard';

function safeStringify(value: unknown, space = 2, maxLength = 6000) {
  try {
    const json = JSON.stringify(value, null, space);
    if (!json) return '';
    return json.length > maxLength ? `${json.slice(0, maxLength)}...` : json;
  } catch (error) {
    return `Unable to stringify value: ${error instanceof Error ? error.message : 'unknown error'}`;
  }
}

const exposedComponents = [
  exposeComponent(SummaryCard, {
    name: 'SummaryCard',
    description: 'Use this to summarise whether the API key test succeeded or failed.',
    props: {
      title: s.string('Short title for the summary card.'),
      body: s.string('Detailed explanation in plain text.'),
      tone: s.string(
        'Visual tone for the card. Use success, info, warning, or danger to reflect the result.',
      ),
    },
  }),
  exposeComponent(KeyValueList, {
    name: 'KeyValueList',
    description: 'Display useful metadata about the API call such as latency and HTTP status.',
    props: {
      heading: s.string('Section heading.'),
      items: s.array(
        'Key metrics or facts about the API response.',
        s.object('Individual key/value pair.', {
          label: s.string('Label to display.'),
          value: s.string('Associated value.'),
        }),
      ),
    },
  }),
  exposeComponent(Note, {
    name: 'Note',
    description: 'Show helpful guidance or follow-up steps for the user.',
    props: {
      text: s.string('Content for the note.'),
    },
    children: false,
  }),
];

interface HashbrownSummaryProps {
  provider: ProviderId;
  providerLabel: string;
  result: ApiCheckSuccess | null;
}

export function HashbrownSummary({ provider, providerLabel, result }: HashbrownSummaryProps) {
  const url = `/api/hashbrown/${provider}`;

  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-sm text-white/60">
        Run a check and we will generate a quick summary here.
      </div>
    );
  }

  return (
    <HashbrownProvider key={`${provider}-${result.status}-${result.durationMs}`} url={url}>
      <SummaryRuntime provider={provider} providerLabel={providerLabel} result={result} />
    </HashbrownProvider>
  );
}

interface SummaryRuntimeProps extends HashbrownSummaryProps {}

function SummaryRuntime({ provider, providerLabel, result }: SummaryRuntimeProps) {
  const lastPayloadRef = useRef<string | null>(null);
  const summaryModel = provider === 'gemini' ? 'gemini-2.5-flash' : result.modelUsed ?? providerMetadata[provider].defaultModel;
  const model = summaryModel;

  const payloadForAi = useMemo(() => {
    return safeStringify(
      {
        provider,
        providerLabel,
        prompt: result.prompt,
        status: result.status,
        latencyMs: result.durationMs,
        modelUsed: summaryModel,
        textOutput: result.textOutput,
        responsePayload: result.responsePayload,
      },
      2,
      6000,
    );
  }, [provider, providerLabel, result, summaryModel]);

  const {
    messages,
    sendMessage,
    stop,
    setMessages,
    isReceiving,
    isSending,
    error,
  } = useUiChat({
    debugName: 'api-summary',
    model,
    system:
      'You help developers understand whether an API key check succeeded. Use the provided components to share a clear status, key metrics, and any follow-up advice. Focus on being concise.',
    components: exposedComponents,
  });

  useEffect(() => {
    if (!payloadForAi) return;
    if (lastPayloadRef.current === payloadForAi) return;
    lastPayloadRef.current = payloadForAi;
    if (isReceiving || isSending) {
      stop(true);
    }
    setMessages([]);
    sendMessage({
      role: 'user',
      content: `Here is the latest API check result in JSON format. Summarize it for the user and call out whether the key worked.\n${payloadForAi}`,
    });
  }, [payloadForAi, sendMessage, setMessages, stop, isReceiving, isSending]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-6">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/90">Hashbrown summary</h2>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-white/60">
          {providerLabel}
        </span>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-500/60 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error.message}
        </div>
      ) : null}

      {(isReceiving || isSending) && (
        <div className="flex items-center gap-2 text-sm text-white/60">
          <div className="h-3 w-3 animate-pulse rounded-full bg-white/40" />
          Generating summary...
        </div>
      )}

      <div className="flex flex-col gap-4">
        {messages
          .filter((entry) => entry.role === 'assistant')
          .map((entry, index) => (
            <div key={index} className="flex flex-col gap-4">
              {entry.ui && entry.ui.length > 0 ? (
                entry.ui
              ) : (
                <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4 text-sm text-white/80">
                  {typeof entry.content === 'string'
                    ? entry.content
                    : 'Assistant response received.'}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
