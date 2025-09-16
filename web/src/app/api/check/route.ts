import { NextRequest, NextResponse } from 'next/server';

import {
  getProviderCall,
  parseProviderRequest,
  providerMetadata,
} from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, prompt } = parseProviderRequest(body);
    const model = body?.model ? String(body.model) : undefined;
    const system = body?.system ? String(body.system) : undefined;

    const invoke = getProviderCall(provider);

    const startedAt = Date.now();
    const result = await invoke({ prompt, model, system });
    const durationMs = Date.now() - startedAt;

    const metadata = providerMetadata[provider];

    return NextResponse.json(
      {
        success: true,
        provider,
        providerLabel: metadata.label,
        durationMs,
        modelUsed: model ?? metadata.defaultModel,
        prompt,
        requestPayload: result.requestPayload,
        responsePayload: result.rawResponse,
        textOutput: result.textOutput,
        status: result.status,
      },
      {
        status: result.status,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error while checking key';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
