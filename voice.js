import { sendMessage, sendMessageChunked, sendVoice, startTypingIndicator, getFile, downloadFile } from './telegram.js';
import { transcribeAudio } from './stt.js';
import { askGroq, splitQuickTip } from './groq.js';
import { textToSpeech } from './tts.js';
import { getHistory, appendHistory, getUserSettings, setUserSettings } from './storage.js';
import { resolveResponseMode, checkAndResetSticky } from './responseMode.js';

const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // Telegram's getFile only serves files up to 20 MB

export async function handleVoice(msg, env) {
  const chatId = msg.chat.id;
  const voice = msg.voice || msg.audio;

  if (voice.file_size && voice.file_size > MAX_AUDIO_BYTES) {
    await sendMessage(chatId, '🔊 That audio is too long — please send a shorter voice message, or type your text.', env);
    return;
  }

  let stopTyping = startTypingIndicator(chatId, env);

  try {
    let audioBuffer;
    try {
      const file = await getFile(voice.file_id, env);
      audioBuffer = await downloadFile(file.file_path, env);
    } catch (e) {
      console.error('Failed to download voice:', e);
      await sendMessage(chatId, '⚠️ Could not download your voice message. Try again!', env);
      return;
    }

    let transcript;
    try {
      transcript = await transcribeAudio(audioBuffer, env);
    } catch (e) {
      console.error('Transcription failed:', e);
      await sendMessage(chatId, '⚠️ Could not understand the audio. Try speaking more clearly, or type your message.', env);
      return;
    }

    if (!transcript) {
      await sendMessage(chatId, '🤔 I couldn\'t catch that. Could you repeat or type your message?', env);
      return;
    }

    await sendMessage(chatId, `🎤 <i>I heard: "${transcript}"</i>`, env);

    const [history, settings] = await Promise.all([
      getHistory(chatId, env),
      getUserSettings(chatId, env)
    ]);

    const updatedSettings = checkAndResetSticky('voice', settings);
    if (updatedSettings.stickyMode !== settings.stickyMode) {
      await setUserSettings(chatId, updatedSettings, env);
    }

    const mode = resolveResponseMode('voice', updatedSettings);

    let reply;
    try {
      reply = await askGroq(transcript, history, updatedSettings, env);
    } catch (e) {
      console.error('LLM error:', e);
      await sendMessage(chatId, '⚠️ Problem getting a reply. Try again!', env);
      return;
    }

    await appendHistory(chatId, [
      { role: 'user', text: transcript },
      { role: 'model', text: reply }
    ], env);

    if (mode === 'voice') {
      stopTyping();
      stopTyping = startTypingIndicator(chatId, env, 'record_voice');
      const { main, tip } = splitQuickTip(reply);
      const plainReply = main.replace(/<[^>]*>/g, '');
      const audio = await textToSpeech(chatId, plainReply, updatedSettings, env);

      if (audio) {
        await sendVoice(chatId, audio, env);
        if (tip) {
          await sendMessage(chatId, tip, env);
        }
      } else {
        await sendMessageChunked(chatId, reply, env);
      }
    } else {
      await sendMessageChunked(chatId, reply, env);
    }
  } finally {
    stopTyping();
  }
}
