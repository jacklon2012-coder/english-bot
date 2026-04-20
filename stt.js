/**
 * Speech-to-text using Groq Whisper API
 * Free tier: ~2 hours audio/day
 */
export async function transcribeAudio(audioBuffer, env) {
  const form = new FormData();
  form.append(
    'file',
    new Blob([audioBuffer], { type: 'audio/ogg' }),
    'voice.ogg'
  );
  form.append('model', 'whisper-large-v3');
  form.append('language', 'en');
  // Hint to Whisper that we expect American English
  form.append('prompt', 'American English conversation');
  form.append('response_format', 'text');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`
    },
    body: form
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq Whisper error: ${res.status} - ${err}`);
  }

  // response_format=text returns plain text
  const text = await res.text();
  return text.trim();
}
