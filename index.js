/**
 * Telegram English Practice Bot
 * Cloudflare Workers + Gemini + Groq Whisper + ElevenLabs/gTTS
 */

import { handleMessage } from './message.js';
import { handleVoice } from './voice.js';
import { handleCallback } from './callback.js';

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('English Practice Bot is running!', { status: 200 });
    }

    try {
      const update = await request.json();
      // Return 200 to Telegram immediately, process in background
      ctx.waitUntil(handleUpdate(update, env));
    } catch (e) {
      console.error('Error parsing update:', e);
    }

    return new Response('OK', { status: 200 });
  }
};

async function handleUpdate(update, env) {
  if (update.message) {
    const msg = update.message;

    if (msg.voice || msg.audio) {
      await handleVoice(msg, env);
    } else if (msg.text) {
      await handleMessage(msg, env);
    }
  } else if (update.callback_query) {
    await handleCallback(update.callback_query, env);
  }
}
