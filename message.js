import { sendMessage, sendMessageChunked, sendVoice, sendChatAction } from './telegram.js';
import { askGroq as askGemini } from './groq.js';
import { textToSpeech } from './tts.js';
import { getHistory, addToHistory, clearHistory, getUserSettings, setUserSettings } from './storage.js';
import { showSettings, DEFAULTS } from './settings.js';
import { resolveResponseMode, checkAndResetSticky } from './responseMode.js';

export async function handleMessage(msg, env) {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text.startsWith('/')) {
    return handleCommand(text, chatId, env);
  }

  await sendChatAction(chatId, 'typing', env);

  const [history, settings] = await Promise.all([
    getHistory(chatId, env),
    getUserSettings(chatId, env)
  ]);

  const updatedSettings = checkAndResetSticky('text', settings);
  if (updatedSettings.stickyMode !== settings.stickyMode) {
    await setUserSettings(chatId, updatedSettings, env);
  }

  const mode = resolveResponseMode('text', updatedSettings);

  let reply;
  try {
    reply = await askGemini(text, history, updatedSettings, env);
  } catch (e) {
    console.error('Gemini error:', e);
    await sendMessage(chatId, '⚠️ Sorry, I had a problem connecting. Try again!', env);
    return;
  }

  await addToHistory(chatId, 'user', text, env);
  await addToHistory(chatId, 'model', reply, env);

  if (mode === 'voice') {
    await sendChatAction(chatId, 'record_voice', env);
    const plainReply = reply.replace(/<[^>]*>/g, '');
    const audio = await textToSpeech(plainReply, updatedSettings, env);

    if (audio) {
      await sendVoice(chatId, audio, env);
      if (reply.includes('💬')) {
        const tip = reply.substring(reply.indexOf('💬'));
        await sendMessage(chatId, tip, env);
      }
    } else {
      await sendMessageChunked(chatId, reply, env);
    }
  } else {
    await sendMessageChunked(chatId, reply, env);
  }
}

async function handleCommand(text, chatId, env) {
  const cmd = text.split(' ')[0].toLowerCase();

  switch (cmd) {
    case '/start': {
      // Initialize with defaults if first time
      const existing = await getUserSettings(chatId, env);
      if (!existing.initialized) {
        await setUserSettings(chatId, { ...DEFAULTS, initialized: true }, env);
      }
      await sendMessage(chatId,
        `👋 Hi! I'm <b>Alex</b>, your American English conversation partner.\n\n` +
        `I'll chat with you in English and gently help with mistakes.\n\n` +
        `<b>Commands:</b>\n` +
        `/settings — customize level, topics, voice\n` +
        `/voice — toggle voice replies\n` +
        `/new — start fresh conversation\n` +
        `/help — show this message`,
        env
      );
      const settings = await getUserSettings(chatId, env);
      const starter = await askGemini(
        'Start the conversation with a friendly greeting and an interesting question.',
        [], settings, env
      );
      await sendMessage(chatId, starter, env);
      await addToHistory(chatId, 'model', starter, env);
      break;
    }

    case '/settings':
      await showSettings(chatId, env);
      break;

    case '/new': {
      await clearHistory(chatId, env);
      await sendMessage(chatId, '🔄 Fresh start!', env);
      const settings = await getUserSettings(chatId, env);
      const starter = await askGemini(
        'Start a new conversation with a greeting and an interesting open-ended question on a random topic.',
        [], settings, env
      );
      await sendMessage(chatId, starter, env);
      await addToHistory(chatId, 'model', starter, env);
      break;
    }

    case '/voice': {
      const settings = await getUserSettings(chatId, env);
      settings.voiceMode = !settings.voiceMode;
      settings.stickyMode = true;
      await setUserSettings(chatId, settings, env);
      const status = settings.voiceMode ? '🔊 Голос (закреплён)' : '💬 Текст (закреплён)';
      await sendMessage(chatId, status, env);
      break;
    }

    case '/help':
      await sendMessage(chatId,
        `<b>English Practice Bot</b>\n\n` +
        `/settings — level, topics, voice gender\n` +
        `/voice — toggle voice replies on/off\n` +
        `/new — start fresh conversation\n` +
        `/help — this message\n\n` +
        `You can also send <b>voice messages</b> 🎤`,
        env
      );
      break;

    default:
      await sendMessage(chatId, `Unknown command. Try /help`, env);
  }
}
