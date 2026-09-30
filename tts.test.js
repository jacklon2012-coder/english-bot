import { describe, it, expect } from 'vitest';
import { cutToLength } from './tts.js';

describe('cutToLength', () => {
  it('returns short text untouched', () => {
    expect(cutToLength('Short.', 200)).toBe('Short.');
  });

  it('cuts at the last sentence boundary within the limit', () => {
    const text = 'First sentence. '.repeat(20) + 'Trailing words';
    const cut = cutToLength(text, 200);
    expect(cut.length).toBeLessThanOrEqual(200);
    expect(cut.endsWith('.')).toBe(true);
    expect(text.startsWith(cut)).toBe(true);
  });

  it('falls back to a word boundary without sentence punctuation', () => {
    expect(cutToLength('one two three four five', 10)).toBe('one two');
  });

  it('hard-cuts text with no separators at all', () => {
    expect(cutToLength('a'.repeat(500), 200)).toHaveLength(200);
  });
});
