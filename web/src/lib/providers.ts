import { z } from 'zod';

export type ProviderId = 'openai' | 'claude' | 'gemini';

export interface ProviderRequest {
  provider: ProviderId;
  prompt: string;
}

export interface ProviderCallOptions {
  prompt: string;
  system?: string;
  model?: string;
  signal?: AbortSignal;
}

export interface ProviderCallResult {
  rawResponse: unknown;
  textOutput: string | null;
  requestPayload: unknown;
  status: number;
}

const providerRequestSchema = z.object({
  provider: z.enum(['openai', 'claude', 'gemini']),
  prompt: z.string().min(1, 'Prompt is required'),
});

export function parseProviderRequest(json: unknown): ProviderRequest {
  return providerRequestSchema.parse(json);
}

export const providerMetadata: Record<ProviderId, { label: string; defaultModel: string; envKey: string }> = {
  openai: {
    label: 'OpenAI',
    defaultModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    envKey: 'OPENAI_API_KEY',
  },
  claude: {
    label: 'Claude',
    defaultModel: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20240620',
    envKey: 'ANTHROPIC_API_KEY',
  },
  gemini: {
    label: 'Gemini',
    defaultModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite',
    envKey: 'GEMINI_API_KEY',
  },
};

export async function callOpenAI({ prompt, system, model, signal }: ProviderCallOptions): Promise<ProviderCallResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com';
  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
  const body = {
    model: model ?? providerMetadata.openai.defaultModel,
    messages: [
      {
        role: 'system',
        content:
          system ?? 'You help test whether an OpenAI API key works by echoing the user prompt clearly.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  const raw = await response.json().catch(() => undefined);
  let text: string | null = null;
  const choice = Array.isArray(raw?.choices) ? raw.choices[0] : undefined;
  if (choice?.message?.content) {
    text = choice.message.content;
  }

  return {
    rawResponse: raw,
    textOutput: text,
    requestPayload: body,
    status: response.status,
  };
}

export async function callClaude({ prompt, system, model, signal }: ProviderCallOptions): Promise<ProviderCallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com';
  const url = `${baseUrl.replace(/\/$/, '')}/v1/messages`;
  const body = {
    model: model ?? providerMetadata.claude.defaultModel,
    system: system ?? 'You help verify the Anthropic Claude API key.',
    max_tokens: Number(process.env.ANTHROPIC_MAX_TOKENS ?? 1024),
    messages: [
      {
        role: 'user' as const,
        content: prompt,
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': process.env.ANTHROPIC_VERSION ?? '2023-06-01',
    },
    body: JSON.stringify(body),
    signal,
  });

  const raw = await response.json().catch(() => undefined);
  let text: string | null = null;
  if (Array.isArray(raw?.content)) {
    text = raw.content
      .map((part: any) => {
        if (typeof part?.text === 'string') return part.text;
        return typeof part === 'string' ? part : undefined;
      })
      .filter(Boolean)
      .join('\n');
  }

  return {
    rawResponse: raw,
    textOutput: text,
    requestPayload: body,
    status: response.status,
  };
}

export async function callGemini({ prompt, system, model, signal }: ProviderCallOptions): Promise<ProviderCallResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const chosenModel = model ?? providerMetadata.gemini.defaultModel;
  const baseUrl = process.env.GEMINI_API_BASE ?? 'https://generativelanguage.googleapis.com';
  const url = `${baseUrl.replace(/\/$/, '')}/v1beta/models/${chosenModel}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  const raw = await response.json().catch(() => undefined);
  let text: string | null = null;
  const candidates = Array.isArray(raw?.candidates) ? raw.candidates : [];
  if (candidates.length > 0 && Array.isArray(candidates[0]?.content?.parts)) {
    text = candidates[0].content.parts
      .map((part: any) => (typeof part?.text === 'string' ? part.text : null))
      .filter(Boolean)
      .join('\n');
  }

  return {
    rawResponse: raw,
    textOutput: text,
    requestPayload: body,
    status: response.status,
  };
}

export function getProviderCall(provider: ProviderId) {
  switch (provider) {
    case 'openai':
      return callOpenAI;
    case 'claude':
      return callClaude;
    case 'gemini':
      return callGemini;
    default:
      throw new Error(`Unsupported provider: ${provider satisfies never}`);
  }
}
