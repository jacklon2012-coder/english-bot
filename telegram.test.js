import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chunkText, sendMessage, startTypingIndicator } from './telegram.js';

const ENV = { TELEGRAM_TOKEN: 'test-token' };

function tgResponse(payload) {
  return new Response(JSON.stringify(payload), { status: 200 });
}

describe('chunkText', () => {
  it('splits on blank lines', () => {
    expect(chunkText('first\n\nsecond\n\n\nthird')).toEqual(['first', 'second', 'third']);
  });

  it('keeps a short text as one chunk', () => {
    expect(chunkText('hello')).toEqual(['hello']);
  });

  it('splits long text at spaces within the limit', () => {
    const text = 'word '.repeat(1500); // 7500 chars
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(4000);
    }
    expect(chunks.join(' ')).toBe(text.trim());
  });

  it('hard-splits text without any spaces', () => {
    const text = 'a'.repeat(9000);
    const chunks = chunkText(text);
    expect(chunks.join('')).toBe(text);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(4000);
    }
  });
});

describe('sendMessage HTML fallback', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('retries without parse_mode when HTML parsing fails', async () => {
    const bodies = [];
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      bodies.push(JSON.parse(init.body));
      if (bodies.length === 1) {
        return tgResponse({ ok: false, description: "Bad Request: can't parse entities" });
      }
      return tgResponse({ ok: true, result: { message_id: 1 } });
    }));

    const data = await sendMessage(1, 'a < b', ENV);

    expect(data.ok).toBe(true);
    expect(bodies[0].parse_mode).toBe('HTML');
    expect(bodies[1].parse_mode).toBeUndefined();
    expect(bodies[1].text).toBe('a < b');
  });

  it('does not retry on non-parse errors', async () => {
    const bodies = [];
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      bodies.push(JSON.parse(init.body));
      return tgResponse({ ok: false, description: 'Bad Request: chat not found' });
    }));

    const data = await sendMessage(1, 'hi', ENV);

    expect(data.ok).toBe(false);
    expect(bodies.length).toBe(1);
  });
});

describe('startTypingIndicator', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sends the action immediately and every 4s until stopped', async () => {
    const bodies = [];
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      bodies.push(JSON.parse(init.body));
      return tgResponse({ ok: true });
    }));

    const stop = startTypingIndicator(1, ENV);
    expect(bodies.length).toBe(1);
    expect(bodies[0].action).toBe('typing');

    await vi.advanceTimersByTimeAsync(4000);
    expect(bodies.length).toBe(2);

    await vi.advanceTimersByTimeAsync(4000);
    expect(bodies.length).toBe(3);

    stop();
    await vi.advanceTimersByTimeAsync(12000);
    expect(bodies.length).toBe(3);
  });
});
