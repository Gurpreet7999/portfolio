export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'https://auto-flow79.vercel.app',
  'http://localhost:3000',
  'http://localhost',
];

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));

  if (!isAllowed) {
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!agentId) {
    return new Response('Config error', { status: 500 });
  }

  return new Response(JSON.stringify({ agentId }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Cache-Control': 'no-store',
    }
  });
}
