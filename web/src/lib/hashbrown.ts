import { encodeFrame } from '@hashbrownai/core';
import type { Chat } from '@hashbrownai/core';
import { HashbrownGoogle } from '@hashbrownai/google';
import { HashbrownOpenAI } from '@hashbrownai/openai';

import { providerMetadata, type ProviderId } from './providers';

export type CompletionRequest = Chat.Api.CompletionCreateParams;

interface StreamOptions {
  provider: ProviderId;
  request: CompletionRequest;
}

function ensureEnv(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not set`);
  }
  return value;
}

export async function toReadableStream({ provider, request }: StreamOptions) {
  switch (provider) {
    case 'openai':
      return iterableToReadable(
        HashbrownOpenAI.stream.text({
          apiKey: ensureEnv(providerMetadata.openai.envKey),
          baseURL: process.env.OPENAI_BASE_URL,
          request,
        }),
      );
    case 'gemini':
      return iterableToReadable(
        HashbrownGoogle.stream.text({
          apiKey: ensureEnv(providerMetadata.gemini.envKey),
          request,
        }),
      );
    case 'claude':
      return iterableToReadable(anthropicStream(request));
    default:
      throw new Error(`Unsupported provider: ${provider satisfies never}`);
  }
}

async function* anthropicStream(request: CompletionRequest) {
  const apiKey = ensureEnv(providerMetadata.claude.envKey);
  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com';
  const url = `${baseUrl.replace(/\/$/, '')}/v1/messages`;

  const body = {
    model: request.model ?? providerMetadata.claude.defaultModel,
    system: request.system,
    max_tokens: Number(process.env.ANTHROPIC_MAX_TOKENS ?? 1024),
    messages: request.messages.map((message) => {
      if (message.role === 'tool') {
        return {
          role: 'assistant' as const,
          content: JSON.stringify({
            toolCallId: message.toolCallId,
            payload: message.content,
          }),
        };
      }

      if (message.role === 'assistant') {
        const content =
          typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content);
        return {
          role: 'assistant' as const,
          content,
        };
      }

      if (message.role === 'error') {
        return {
          role: 'assistant' as const,
          content: `Runtime error: ${message.content}`,
        };
      }

      return {
        role: message.role,
        content: message.content,
      } as const;
    }),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': process.env.ANTHROPIC_VERSION ?? '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    yield encodeFrame({
      type: 'error',
      error: `Claude request failed (${response.status}): ${errorText}`,
    });
    yield encodeFrame({ type: 'finish' });
    return;
  }

  const payload = await response.json().catch(() => undefined);
  const textChunks = Array.isArray(payload?.content)
    ? payload.content
        .map((part: any) => {
          if (typeof part?.text === 'string') return part.text;
          return typeof part === 'string' ? part : undefined;
        })
        .filter(Boolean)
    : [];

  const chunk = {
    choices: [
      {
        index: 0,
        delta: {
          content: textChunks.join('\n'),
          role: 'assistant',
        },
        finishReason: payload?.stop_reason ?? 'stop',
      },
    ],
  } satisfies Chat.Api.CompletionChunk;

  yield encodeFrame({ type: 'chunk', chunk });
  yield encodeFrame({ type: 'finish' });
}

function iterableToReadable(iterable: AsyncIterable<Uint8Array>) {
  const iterator = iterable[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(value);
    },
    async cancel(reason) {
      if (iterator.return) {
        await iterator.return(reason);
      }
    },
  });
}
