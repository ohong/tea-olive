import { NextRequest } from 'next/server';

import { toReadableStream, type CompletionRequest } from '@/lib/hashbrown';
import { providerMetadata, type ProviderId } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: { provider: string } }) {
  const provider = context.params.provider as ProviderId;
  if (!providerMetadata[provider as ProviderId]) {
    return new Response('Unsupported provider', { status: 400 });
  }

  try {
    const payload = (await request.json()) as CompletionRequest;
    const stream = await toReadableStream({ provider, request: payload });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error while processing Hashbrown request';
    return new Response(message, { status: 500 });
  }
}
