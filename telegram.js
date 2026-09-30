const TG_API = (token) => `https://api.telegram.org/bot${token}`;

async function callTg(method, payload, env) {
  const res = await fetch(`${TG_API(env.TELEGRAM_TOKEN)}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function logFailure(method, data) {
  console.error(`${method} failed:`, data.description || JSON.stringify(data));
}

export async function sendMessage(chatId, text, env, options = {}) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...options
  };

  let data = await callTg('sendMessage', body, env);

  // LLM replies are free text — an HTML parse error must not lose the message
  if (!data.ok && body.parse_mode && /parse|entity/i.test(data.description || '')) {
    delete body.parse_mode;
    data = await callTg('sendMessage', body, env);
  }

  if (!data.ok) logFailure('sendMessage', data);
  return data;
}

export async function sendVoice(chatId, audioBuffer, env) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('voice', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'voice.mp3');

  const res = await fetch(`${TG_API(env.TELEGRAM_TOKEN)}/sendVoice`, {
    method: 'POST',
    body: form
  });
  const data = await res.json();
  if (!data.ok) logFailure('sendVoice', data);
  return data;
}

export async function sendChatAction(chatId, action, env) {
  await callTg('sendChatAction', { chat_id: chatId, action }, env);
}

export async function getFile(fileId, env) {
  const data = await callTg('getFile', { file_id: fileId }, env);
  if (!data.ok) logFailure('getFile', data);
  return data.result;
}

export async function downloadFile(filePath, env) {
  const url = `https://api.telegram.org/file/bot${env.TELEGRAM_TOKEN}/${filePath}`;
  const res = await fetch(url);
  return res.arrayBuffer();
}

const TG_CHUNK_LIMIT = 4000; // hard cap below Telegram's 4096-char message limit

export function chunkText(text) {
  const paragraphs = text.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  const chunks = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= TG_CHUNK_LIMIT) {
      chunks.push(paragraph);
      continue;
    }
    let rest = paragraph;
    while (rest.length > TG_CHUNK_LIMIT) {
      let cut = rest.lastIndexOf('\n', TG_CHUNK_LIMIT);
      if (cut <= 0) cut = rest.lastIndexOf(' ', TG_CHUNK_LIMIT);
      if (cut <= 0) cut = TG_CHUNK_LIMIT;
      chunks.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) chunks.push(rest);
  }
  return chunks;
}

export async function sendMessageChunked(chatId, text, env) {
  const chunks = chunkText(text);
  for (const chunk of chunks) {
    await sendMessage(chatId, chunk, env);
    if (chunks.length > 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

export async function editMessage(chatId, messageId, text, keyboard, env) {
  const body = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  };
  if (keyboard) body.reply_markup = keyboard;

  const data = await callTg('editMessageText', body, env);
  if (!data.ok) logFailure('editMessageText', data);
  return data;
}

// Telegram shows a chat action for ~5s; keep it alive during long LLM/TTS work.
// Returns a stop function.
export function startTypingIndicator(chatId, env, action = 'typing') {
  const send = () => sendChatAction(chatId, action, env);
  send();
  const timer = setInterval(send, 4000);
  return () => clearInterval(timer);
}
