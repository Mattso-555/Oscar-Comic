// Serverless proxy: the browser never sees the API key.
// Set ANTHROPIC_API_KEY in Vercel > Project > Settings > Environment Variables.
// If the key is missing, we return 503 and the client falls back to offline ideas.

export async function POST(request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json({ error: 'no-key' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad-json' }, { status: 400 });
  }

  // Only allow the narrow shape our app sends — this route is not a general proxy.
  const { system, prompt, maxTokens } = body || {};
  if (typeof prompt !== 'string' || prompt.length > 4000) {
    return Response.json({ error: 'bad-prompt' }, { status: 400 });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: Math.min(maxTokens || 1000, 1500),
      temperature: 1,
      system: typeof system === 'string' ? system.slice(0, 2000) : undefined,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    return Response.json({ error: 'upstream', status: res.status }, { status: 502 });
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return Response.json({ text });
}
