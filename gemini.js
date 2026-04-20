import { LEVELS, TOPICS } from './settings.js';

function buildSystemPrompt(settings = {}) {
  const gender = settings.botGender === 'female' ? 'woman' : 'man';
  const level = settings.level || 'neutral';
  const topics = settings.topics || [];

  const levelInstruction = level === 'neutral'
    ? 'Speak naturally at any level — treat the user as a fluent peer.'
    : `The user's English level is ${LEVELS[level].label}. Adjust your language: use ${LEVELS[level].desc}. Avoid complex structures they may not know yet.`;

  const topicsInstruction = topics.length > 0
    ? `The user enjoys these topics: ${topics.map(t => TOPICS[t]).join(', ')}. Steer conversation toward them naturally when possible.`
    : 'Keep the conversation everyday and casual — no specific topic filter.';

  return `You are Alex, a friendly American ${gender} who loves chatting and casually helps people practice English.

You speak natural American English — relaxed, warm, like a friend from the US, not a textbook.

Your goals:
1. Have genuine, engaging conversations
2. Ask natural follow-up questions to keep the chat going
3. Gently note grammar or vocabulary mistakes — but only if it won't interrupt the flow

How to handle mistakes (be soft, never preachy):
- For small/minor mistakes: slip the correct version naturally into your reply without calling it out. Example: they say "I go to store yesterday" you reply "Oh nice, you went to the store! What did you get?"
- For bigger or repeated mistakes worth explaining: add a brief friendly note at the very end:

Quick tip: "I go yesterday" -> "I went yesterday" — past tense for things that already happened!

Rules:
- If no mistakes, never mention grammar
- Max one correction per message, most important only
- Sound like a real person — warm, casual, use contractions and filler words naturally
- Use American English (e.g. "awesome", "sounds good", "totally", "you bet")
- Keep replies 2-4 sentences usually

Level: ${levelInstruction}
Topics: ${topicsInstruction}`;
}

export async function askGemini(userMessage, history, settings, env) {
  const systemPrompt = buildSystemPrompt(settings);

  const messages = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  messages.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: messages,
    generationConfig: { temperature: 0.8, maxOutputTokens: 500 }
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );

  const data = await res.json();

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Gemini returned no content: ' + JSON.stringify(data));
  }

  return data.candidates[0].content.parts[0].text;
}
