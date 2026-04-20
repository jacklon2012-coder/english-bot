import { sendMessage, sendVoice, sendChatAction, getFile, downloadFile } from '../telegram.js';
import { transcribeAudio } from '../stt.js';
import { askGemini } from '../gemini.js';
import { textToSpeech } from '../tts.js';
import { getHistory, addToHistory, getUserSettings } from '../storage.js';

export async function handleVoice(msg, env) {
  const chatId = msg.chat.id;
  const voice = msg.voice || msg.audio;

  await sendChatAction(chatId, 'typing', env);

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
  await sendChatAction(chatId, 'typing', env);

  const [history, settings] = await Promise.all([
    getHistory(chatId, env),
    getUserSettings(chatId, env)
  ]);

  let reply;
  try {
    reply = await askGemini(transcript, history, settings, env);
  } catch (e) {
    console.error('Gemini error:', e);
    await sendMessage(chatId, '⚠️ Problem getting a reply. Try again!', env);
    return;
  }

  await addToHistory(chatId, 'user', transcript, env);
  await addToHistory(chatId, 'model', reply, env);

  await sendChatAction(chatId, 'record_voice', env);
  const plainReply = reply.replace(/<[^>]*>/g, '');
  const audio = await textToSpeech(plainReply, settings, env);

  if (audio) {
    await sendVoice(chatId, audio, env);
    if (reply.includes('💬')) {
      const tip = reply.substring(reply.indexOf('💬'));
      await sendMessage(chatId, tip, env);
    }
  } else {
    await sendMessage(chatId, reply, env);
  }
}
