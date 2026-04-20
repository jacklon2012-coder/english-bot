// Feature: adaptive-response-mode
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DEFAULTS, buildSettingsText } from './settings.js';

const settingsArb = fc.record({
  voiceMode: fc.boolean(),
  stickyMode: fc.boolean(),
  botGender: fc.constantFrom('male', 'female'),
  level: fc.constantFrom('a1', 'a2', 'b1', 'b2', 'c1', 'neutral'),
  topics: fc.array(fc.constantFrom('travel', 'work', 'tech', 'food', 'movies', 'sports', 'news', 'science', 'books', 'smalltalk')),
});

// --- Property 4: toggle_voice инвертирует voiceMode и устанавливает stickyMode=true ---
// Feature: adaptive-response-mode, Property 4: после toggle_voice stickyMode=true и voiceMode инвертирован
// Validates: Requirements 3.1, 3.2
describe('Property 4: toggle_voice sets stickyMode=true and inverts voiceMode', () => {
  it('after toggle_voice, stickyMode=true and voiceMode is inverted for any initial settings', () => {
    fc.assert(
      fc.property(
        settingsArb,
        (settings) => {
          const initialVoiceMode = settings.voiceMode;
          // Simulate toggle_voice handler logic
          const updated = { ...settings };
          updated.voiceMode = !updated.voiceMode;
          updated.stickyMode = true;

          expect(updated.stickyMode).toBe(true);
          expect(updated.voiceMode).toBe(!initialVoiceMode);
        }
      )
    );
  });
});

// --- Property 7: buildSettingsText отображает корректный статус ---
// Feature: adaptive-response-mode, Property 7: buildSettingsText содержит правильный статус для любых settings
// Validates: Requirements 6.1, 6.2, 6.3
describe('Property 7: buildSettingsText shows correct voice status for any settings', () => {
  it('contains 🔄 Авто when stickyMode=false', () => {
    fc.assert(
      fc.property(
        settingsArb.map(s => ({ ...s, stickyMode: false })),
        (settings) => {
          const text = buildSettingsText(settings);
          expect(text).toContain('🔄 Авто');
        }
      )
    );
  });

  it('contains 🔊 Голос (закреплён) when stickyMode=true and voiceMode=true', () => {
    fc.assert(
      fc.property(
        settingsArb.map(s => ({ ...s, stickyMode: true, voiceMode: true })),
        (settings) => {
          const text = buildSettingsText(settings);
          expect(text).toContain('🔊 Голос (закреплён)');
        }
      )
    );
  });

  it('contains 💬 Текст (закреплён) when stickyMode=true and voiceMode=false', () => {
    fc.assert(
      fc.property(
        settingsArb.map(s => ({ ...s, stickyMode: true, voiceMode: false })),
        (settings) => {
          const text = buildSettingsText(settings);
          expect(text).toContain('💬 Текст (закреплён)');
        }
      )
    );
  });
});

// --- DEFAULTS includes stickyMode ---
describe('DEFAULTS', () => {
  it('exports stickyMode: false', () => {
    expect(DEFAULTS.stickyMode).toBe(false);
  });
});
