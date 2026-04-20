// Feature: adaptive-response-mode, Property 6: round-trip сохранения stickyMode
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getUserSettings, setUserSettings } from './storage.js';

/**
 * Minimal in-memory KV stub for testing storage round-trips.
 */
function makeKV() {
  const store = new Map();
  return {
    get: async (key) => store.get(key) ?? null,
    put: async (key, value) => { store.set(key, value); },
    delete: async (key) => { store.delete(key); },
  };
}

describe('storage — Property 6: stickyMode round-trip', () => {
  // **Validates: Requirements 3.4, 4.3**
  it('after setUserSettings and getUserSettings, stickyMode matches what was saved', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          voiceMode: fc.boolean(),
          stickyMode: fc.boolean(),
        }),
        async (settings) => {
          const chatId = 'test-user';
          const env = { KV: makeKV() };

          await setUserSettings(chatId, settings, env);
          const loaded = await getUserSettings(chatId, env);

          expect(loaded.stickyMode).toBe(settings.stickyMode);
        }
      )
    );
  });
});
