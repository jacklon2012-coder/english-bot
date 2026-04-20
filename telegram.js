const TG_API = (token) => `https://api.telegram.org/bot${token}`;

export async function sendMessage(chatId, text, env, options = {}) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...options
  };

  const res = await fetch(`${TG_API(env.TELEGRAM_TOKEN)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return res.json();
}

export async function sendVoice(chatId, audioBuffer, env) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('voice', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'voice.mp3');

  const res = await fetch(`${TG_API(env.TELEGRAM_TOKEN)}/sendVoice`, {
    method: 'POST',
    body: form
  });

  return res.json();
}

export async function sendChatAction(chatId, action, env) {
  await fetch(`${TG_API(env.TELEGRAM_TOKEN)}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action })
  });
}

export async function getFile(fileId, env) {
  const res = await fetch(`${TG_API(env.TELEGRAM_TOKEN)}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId })
  });
  const data = await res.json();
  return data.result;
}

export async function downloadFile(filePath, env) {
  const url = `https://api.telegram.org/file/bot${env.TELEGRAM_TOKEN}/${filePath}`;
  const res = await fetch(url);
  return res.arrayBuffer();
}

export async function editMessage(chatId, messageId, text, keyboard, env) {
  const body = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  };
  if (keyboard) body.reply_markup = keyboard;

  await fetch(`${TG_API(env.TELEGRAM_TOKEN)}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}
