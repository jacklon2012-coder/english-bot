const MAX_HISTORY = 20; // Keep last 20 messages to avoid token bloat
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function getHistory(chatId, env) {
  try {
    const data = await env.KV.get(`history:${chatId}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addToHistory(chatId, role, text, env) {
  const history = await getHistory(chatId, env);

  history.push({ role, text });

  // Trim to last MAX_HISTORY messages
  const trimmed = history.slice(-MAX_HISTORY);

  await env.KV.put(
    `history:${chatId}`,
    JSON.stringify(trimmed),
    { expirationTtl: TTL_SECONDS }
  );
}

export async function clearHistory(chatId, env) {
  await env.KV.delete(`history:${chatId}`);
}

export async function getUserSettings(chatId, env) {
  try {
    const data = await env.KV.get(`settings:${chatId}`);
    return data ? JSON.parse(data) : { voiceMode: false };
  } catch {
    return { voiceMode: false };
  }
}

export async function setUserSettings(chatId, settings, env) {
  await env.KV.put(
    `settings:${chatId}`,
    JSON.stringify(settings),
    { expirationTtl: TTL_SECONDS }
  );
}
