import { describe, it, expect } from 'vitest';
import { splitQuickTip } from './groq.js';

describe('splitQuickTip', () => {
  it('returns reply unchanged when there is no tip', () => {
    const reply = 'Oh nice, you went to the store! What did you get?';
    expect(splitQuickTip(reply)).toEqual({ main: reply, tip: null });
  });

  it('splits the trailing Quick tip note', () => {
    const reply = 'Oh nice, you went to the store! What did you get?\n\n' +
      'Quick tip: "I go yesterday" -> "I went yesterday" — past tense!';
    const { main, tip } = splitQuickTip(reply);
    expect(main).toBe('Oh nice, you went to the store! What did you get?');
    expect(tip).toBe('Quick tip: "I go yesterday" -> "I went yesterday" — past tense!');
  });

  it('handles a reply that is only a tip', () => {
    const { main, tip } = splitQuickTip('Quick tip: hello');
    expect(main).toBe('');
    expect(tip).toBe('Quick tip: hello');
  });
});
