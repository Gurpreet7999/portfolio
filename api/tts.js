export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'https://auto-flow79.vercel.app',
  'http://localhost:3000',
  'http://localhost',
];

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));

  // CORS preflight
  if (req.method === 'OPTIONS') {
    if (!isAllowed) return new Response('Forbidden', { status: 403 });
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Block unknown origins — same pattern as chat.js
  if (!isAllowed) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const { text } = await req.json();

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response('Invalid text', { status: 400 });
    }
    if (text.length > 500) {
      return new Response('Text too long', { status: 400 });
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    const apiKey  = process.env.ELEVENLABS_API_KEY;

    if (!voiceId || !apiKey) {
      return new Response('Server config error', { status: 500 });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs error:', err);
      return new Response('TTS error', { status: 502 });
    }

    // Stream audio back — only to allowed origin
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': origin,
      }
    });

  } catch (err) {
    console.error('TTS handler error:', err);
    return new Response('Server error', { status: 500 });
  }
}
