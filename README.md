# tea-olive

Tea Olive is a small Next.js tool that exercises the OpenAI, Claude, and Gemini APIs so you can confirm your keys are still healthy. Paste a prompt, pick the provider, and the app fires a real request, dumps the raw request/response JSON, and asks Hashbrown to generate a quick summary of what happened.

## Run it locally (≈5 minutes)

1. `cd web`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local`
4. Pop your keys into `.env.local` (set whichever providers you plan to check)
5. Start the dev server: `npm run dev`
6. Open the printed URL (usually http://localhost:3000) and run a prompt

Every press of **Run check** calls the chosen provider once and then posts the same payload to the Hashbrown endpoint so the summary card can render. If you only care about the raw payloads, you can remove the summary block in `src/components/HashbrownSummary.tsx`.

### Environment variables

- `OPENAI_API_KEY` (optional extras: `OPENAI_BASE_URL`, `OPENAI_MODEL`)
- `ANTHROPIC_API_KEY` (optional: `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `ANTHROPIC_VERSION`, `ANTHROPIC_MAX_TOKENS`)
- `GEMINI_API_KEY` (optional: `GEMINI_API_BASE`, `GEMINI_MODEL` – defaults to `gemini-2.5-flash-lite`)

Everything else runs in-memory; there’s no persistence or analytics. Delete `web/.env.local` when you’re done if you don’t want the keys sticking around locally.
