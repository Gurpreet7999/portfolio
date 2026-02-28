export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { text, language } = await req.json();
    if (!text || text.length > 500) {
      return new Response('Invalid text', { status: 400 });
    }

    // Rate limit check via simple header (Vercel handles real rate limiting)
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
          text: text,
          model_id: 'eleven_multilingual_v2', // supports Hindi, English, Hinglish
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

    // Stream audio back to browser
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': 'https://auto-flow79.vercel.app',
      }
    });

  } catch (err) {
    console.error('TTS handler error:', err);
    return new Response('Server error', { status: 500 });
  }
}
