import type { ProviderId } from '@/lib/providers';

export interface ApiCheckSuccess {
  success: true;
  provider: ProviderId;
  providerLabel: string;
  durationMs: number;
  modelUsed: string;
  prompt: string;
  requestPayload: unknown;
  responsePayload: unknown;
  textOutput: string | null;
  status: number;
}

export interface ApiCheckFailure {
  success: false;
  error: string;
}

export type ApiCheckResponse = ApiCheckSuccess | ApiCheckFailure;
