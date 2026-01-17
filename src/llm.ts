import OpenAI from 'openai';

function ensureApiKey(): string {
  const apiKey = process.env.XAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY is required');
  }
  return apiKey;
}

function createClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1',
    timeout: 360000
  });
}

function extractText(response: Awaited<ReturnType<ReturnType<typeof createClient>["responses"]["create"]>>): string {
  const output = response.output?.[0];
  if (!output || !('content' in output)) {
    return '';
  }
  const content = output.content as Array<{ type: string; text?: string }>;
  return content.map((part) => part.text || '').join('').trim();
}

export async function generateText(system: string, prompt: string): Promise<string> {
  const apiKey = ensureApiKey();
  const client = createClient(apiKey);
  const response = await client.responses.create({
    model: 'grok-4-1-fast-reasoning',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ]
  });
  return extractText(response);
}
