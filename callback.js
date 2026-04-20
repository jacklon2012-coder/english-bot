import { handleSettingsCallback } from './settings.js';

export async function handleCallback(query, env) {
  // Answer callback immediately to remove loading spinner
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: query.id })
  });

  const data = query.data || '';

  if (data.startsWith('settings:')) {
    await handleSettingsCallback(query, env);
  }
}
