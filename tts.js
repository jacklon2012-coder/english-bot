const ELEVEN_LIMIT = 9500;
const USAGE_TTL_SECONDS = 60 * 60 * 24 * 60; // outlives a monthly reset

// American English premade voice IDs
const VOICES = {
  male:   'ErXwobaYiN019PkySvjV', // Antoni — warm, natural American male
  female: 'EXAVITQu4vr4xnSDxMaL', // Bella — conversational American female
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

// The ElevenLabs quota is account-wide, so per-chat counters only approximate
// it. A single global key raced under KV last-write-wins; overshooting the
// real quota is safe anyway — ElevenLabs errors out and we fall back to gTTS.
async function getElevenUsage(chatId, env) {
  const raw = await env.KV.get(`elevenlabs_usage:${chatId}`);
  if (!raw) return 0;
  const { month, used } = JSON.parse(raw);
  return month === currentMonth() ? used : 0;
}

async function elevenQuotaAvailable(chatId, text, env) {
  if (!env.ELEVENLABS_API_KEY) return false;
  try {
    const used = await getElevenUsage(chatId, env);
    return used + text.length < ELEVEN_LIMIT;
  } catch {
    return false;
  }
}

async function addElevenUsage(chatId, chars, env) {
  try {
    const used = await getElevenUsage(chatId, env);
    await env.KV.put(
      `elevenlabs_usage:${chatId}`,
      JSON.stringify({ month: currentMonth(), used: used + chars }),
      { expirationTtl: USAGE_TTL_SECONDS }
    );
  } catch (e) {
    console.error('Failed to update ElevenLabs usage:', e);
  }
}

export async function textToSpeech(chatId, text, settings = {}, env) {
  if (await elevenQuotaAvailable(chatId, text, env)) {
    try {
      const audio = await elevenLabsTTS(text, settings, env);
      await addElevenUsage(chatId, text.length, env);
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

// Google Translate TTS takes ~200 chars per request; cut at a sentence
// boundary so fallback audio doesn't stop mid-word.
export function cutToLength(text, limit) {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);
  const sentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? ')
  );
  if (sentenceEnd > 0) return slice.slice(0, sentenceEnd + 1);
  const space = slice.lastIndexOf(' ');
  return space > 0 ? slice.slice(0, space) : slice;
}

async function gTTS(text) {
  const chunk = cutToLength(text, 200);
  const encoded = encodeURIComponent(chunk);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=en-US&client=tw-ob`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' }
  });

  if (!res.ok) throw new Error(`gTTS error: ${res.status}`);
  return res.arrayBuffer();
}
