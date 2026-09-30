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

// entries: [{ role, text }] — a whole turn in one KV read+write
export async function appendHistory(chatId, entries, env) {
  const history = await getHistory(chatId, env);

  history.push(...entries);

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

const DEFAULTS = { voiceMode: false, stickyMode: false };

export async function getUserSettings(chatId, env) {
  try {
    const data = await env.KV.get(`settings:${chatId}`);
    return data ? { ...DEFAULTS, ...JSON.parse(data) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setUserSettings(chatId, settings, env) {
  await env.KV.put(
    `settings:${chatId}`,
    JSON.stringify(settings),
    { expirationTtl: TTL_SECONDS }
  );
}
