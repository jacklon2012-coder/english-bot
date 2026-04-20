const ELEVEN_LIMIT = 9500;
const ELEVEN_COUNTER_KEY = 'elevenlabs_chars_used';
const ELEVEN_MONTH_KEY = 'elevenlabs_reset_month';

// American English premade voice IDs
const VOICES = {
  male:   'ErXwobaYiN019PkySvjV', // Antoni — warm, natural American male
  female: 'EXAVITQu4vr4xnSDxMaL', // Bella — conversational American female
};

export async function textToSpeech(text, settings = {}, env) {
  const shouldUseEleven = await checkElevenLabsQuota(text, env);

  if (shouldUseEleven) {
    try {
      const audio = await elevenLabsTTS(text, settings, env);
      await incrementElevenLabsCounter(text.length, env);
      return audio;
    } catch (e) {
      console.error('ElevenLabs failed, falling back to gTTS:', e);
    }
  }

  try {
    return await gTTS(text);
  } catch (e) {
    console.error('gTTS also failed:', e);
    return null;
  }
}

async function checkElevenLabsQuota(text, env) {
  if (!env.ELEVENLABS_API_KEY) return false;
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const storedMonth = await env.KV.get(ELEVEN_MONTH_KEY);
    if (storedMonth !== currentMonth) {
      await env.KV.put(ELEVEN_MONTH_KEY, currentMonth);
      await env.KV.put(ELEVEN_COUNTER_KEY, '0');
      return true;
    }
    const used = parseInt(await env.KV.get(ELEVEN_COUNTER_KEY) || '0');
    return used + text.length < ELEVEN_LIMIT;
  } catch {
    return false;
  }
}

async function incrementElevenLabsCounter(chars, env) {
  try {
    const used = parseInt(await env.KV.get(ELEVEN_COUNTER_KEY) || '0');
    await env.KV.put(ELEVEN_COUNTER_KEY, String(used + chars));
  } catch (e) {
    console.error('Failed to update ElevenLabs counter:', e);
  }
}

async function elevenLabsTTS(text, settings, env) {
  // Use gender from settings, or fall back to env var, or default male
  const gender = settings?.botGender || 'male';
  const voiceId = env.ELEVENLABS_VOICE_ID || VOICES[gender] || VOICES.male;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2', // English-only, low latency
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true
        }
      })
    }
  );

  if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`);
  return res.arrayBuffer();
}

async function gTTS(text) {
  const chunk = text.slice(0, 200);
  const encoded = encodeURIComponent(chunk);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=en-US&client=tw-ob`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' }
  });

  if (!res.ok) throw new Error(`gTTS error: ${res.status}`);
  return res.arrayBuffer();
}
