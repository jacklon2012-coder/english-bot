import { describe, it, expect, vi } from 'vitest';
import worker from './index.js';

const SECRET = 's3cret_token';
const WEBHOOK_URL = 'https://english-bot.example.workers.dev/';

function postRequest(headers = {}) {
  return new Request(WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ update_id: 1 })
  });
}

function makeCtx() {
  return { waitUntil: vi.fn() };
}

describe('webhook secret validation', () => {
  it('allows POST without a secret configured (backwards compat)', async () => {
    const res = await worker.fetch(postRequest(), { TELEGRAM_TOKEN: 't' }, makeCtx());
    expect(res.status).toBe(200);
  });

  it('rejects POST with a missing header when secret is configured', async () => {
    const res = await worker.fetch(postRequest(), { TELEGRAM_WEBHOOK_SECRET: SECRET }, makeCtx());
    expect(res.status).toBe(401);
  });

  it('rejects POST with a wrong header value', async () => {
    const res = await worker.fetch(
      postRequest({ 'X-Telegram-Bot-Api-Secret-Token': 'wrong' }),
      { TELEGRAM_WEBHOOK_SECRET: SECRET },
      makeCtx()
    );
    expect(res.status).toBe(401);
  });

  it('accepts POST with the correct secret header', async () => {
    const res = await worker.fetch(
      postRequest({ 'X-Telegram-Bot-Api-Secret-Token': SECRET }),
      { TELEGRAM_WEBHOOK_SECRET: SECRET },
      makeCtx()
    );
    expect(res.status).toBe(200);
  });

  it('still serves the GET status page', async () => {
    const res = await worker.fetch(
      new Request(WEBHOOK_URL),
      { TELEGRAM_WEBHOOK_SECRET: SECRET },
      makeCtx()
    );
    expect(res.status).toBe(200);
  });
});
