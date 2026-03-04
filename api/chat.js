export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'https://auto-flow79.vercel.app',
  'http://localhost:3000',
  'http://localhost',
];

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';

  // Same-origin requests from Vercel have no origin header — allow them
  // Only block if origin is explicitly set AND not in allowed list
  const isAllowed = !origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o));

  // CORS preflight
  if (req.method === 'OPTIONS') {
    if (!isAllowed) return new Response('Forbidden', { status: 403 });
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!isAllowed) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const body = await req.json();

    // Validate messages exist
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 250,
        temperature: 0.7,
        messages: body.messages
      })
    });

    // Forward Groq's error clearly if it fails
    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq error:', groqRes.status, errText);
      return new Response(JSON.stringify({ error: 'Groq API error', detail: groqRes.status }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || '*',
        }
      });
    }

    const data = await groqRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || '*',
      }
    });

  } catch (err) {
    console.error('Chat handler error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || '*',
      }
    });
  }
}
