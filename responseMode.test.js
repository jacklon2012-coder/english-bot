// Feature: adaptive-response-mode
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { resolveResponseMode, checkAndResetSticky } from './responseMode.js';

const inputTypeArb = fc.constantFrom('voice', 'text');

const settingsArb = fc.record({
  voiceMode: fc.boolean(),
  stickyMode: fc.boolean(),
});

// --- Property 1: Зеркалирование при stickyMode=false ---
// Feature: adaptive-response-mode, Property 1: resolveResponseMode возвращает inputType при stickyMode=false
// Validates: Requirements 1.1, 1.2, 2.3
describe('Property 1: mirroring when stickyMode=false', () => {
  it('resolveResponseMode returns inputType for any settings with stickyMode=false', () => {
    fc.assert(
      fc.property(
        inputTypeArb,
        settingsArb.map(s => ({ ...s, stickyMode: false })),
        (inputType, settings) => {
          expect(resolveResponseMode(inputType, settings)).toBe(inputType);
        }
      )
    );
  });
});

// --- Property 2: Закреплённый режим при stickyMode=true ---
// Feature: adaptive-response-mode, Property 2: resolveResponseMode возвращает voiceMode при stickyMode=true
// Validates: Requirements 1.3, 1.4, 2.2, 3.3
describe('Property 2: sticky mode when stickyMode=true', () => {
  it('resolveResponseMode returns voice when voiceMode=true regardless of inputType', () => {
    fc.assert(
      fc.property(
        inputTypeArb,
        settingsArb.map(s => ({ ...s, stickyMode: true, voiceMode: true })),
        (inputType, settings) => {
          expect(resolveResponseMode(inputType, settings)).toBe('voice');
        }
      )
    );
  });

  it('resolveResponseMode returns text when voiceMode=false regardless of inputType', () => {
    fc.assert(
      fc.property(
        inputTypeArb,
        settingsArb.map(s => ({ ...s, stickyMode: true, voiceMode: false })),
        (inputType, settings) => {
          expect(resolveResponseMode(inputType, settings)).toBe('text');
        }
      )
    );
  });
});

// --- Property 3: Инвариант возвращаемого значения ---
// Feature: adaptive-response-mode, Property 3: resolveResponseMode всегда возвращает 'voice' или 'text' и не бросает исключений
// Validates: Requirements 2.4, 5.3
describe('Property 3: return value invariant', () => {
  it('resolveResponseMode always returns voice or text and never throws', () => {
    fc.assert(
      fc.property(
        inputTypeArb,
        settingsArb,
        (inputType, settings) => {
          const result = resolveResponseMode(inputType, settings);
          expect(['voice', 'text']).toContain(result);
        }
      )
    );
  });
});

// --- Property 5: Сброс stickyMode при совпадении inputType с voiceMode ---
// Feature: adaptive-response-mode, Property 5: checkAndResetSticky сбрасывает stickyMode при совпадении
// Validates: Requirements 4.1
describe('Property 5: checkAndResetSticky resets stickyMode on match', () => {
  it('returns stickyMode=false when voice input matches voiceMode=true', () => {
    fc.assert(
      fc.property(
        settingsArb.map(s => ({ ...s, stickyMode: true, voiceMode: true })),
        (settings) => {
          const result = checkAndResetSticky('voice', settings);
          expect(result.stickyMode).toBe(false);
        }
      )
    );
  });

  it('returns stickyMode=false when text input matches voiceMode=false', () => {
    fc.assert(
      fc.property(
        settingsArb.map(s => ({ ...s, stickyMode: true, voiceMode: false })),
        (settings) => {
          const result = checkAndResetSticky('text', settings);
          expect(result.stickyMode).toBe(false);
        }
      )
    );
  });

  it('does not reset stickyMode when inputType does not match voiceMode', () => {
    fc.assert(
      fc.property(
        settingsArb.map(s => ({ ...s, stickyMode: true, voiceMode: true })),
        (settings) => {
          const result = checkAndResetSticky('text', settings);
          expect(result.stickyMode).toBe(true);
        }
      )
    );

    fc.assert(
      fc.property(
        settingsArb.map(s => ({ ...s, stickyMode: true, voiceMode: false })),
        (settings) => {
          const result = checkAndResetSticky('voice', settings);
          expect(result.stickyMode).toBe(true);
        }
      )
    );
  });
});
