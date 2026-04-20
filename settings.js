import { sendMessage, editMessage } from '../telegram.js';
import { getUserSettings, setUserSettings } from '../storage.js';

// ─── Settings structure ───────────────────────────────────────────────────────

export const DEFAULTS = {
  voiceMode: false,
  botGender: 'male',       // 'male' | 'female'
  level: 'neutral',        // 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'neutral'
  topics: [],              // [] = everyday/no filter, or array of topic keys
};

export const LEVELS = {
  a1:      { label: 'A1 — Beginner',      desc: 'very simple words and short sentences' },
  a2:      { label: 'A2 — Elementary',    desc: 'basic everyday expressions' },
  b1:      { label: 'B1 — Intermediate',  desc: 'clear standard language on familiar topics' },
  b2:      { label: 'B2 — Upper-Inter',   desc: 'complex texts and abstract topics' },
  c1:      { label: 'C1 — Advanced',      desc: 'fluent and spontaneous expression' },
  neutral: { label: '🌟 Native / No filter', desc: 'natural conversation, no adjustments' },
};

export const TOPICS = {
  travel:    '✈️ Travel',
  work:      '💼 Work & Career',
  tech:      '💻 Technology',
  food:      '🍕 Food & Cooking',
  movies:    '🎬 Movies & TV',
  sports:    '⚽ Sports',
  news:      '📰 News & World',
  science:   '🔬 Science',
  books:     '📚 Books & Literature',
  smalltalk: '☕ Small Talk',
};

// ─── Main settings menu ───────────────────────────────────────────────────────

export async function showSettings(chatId, env, messageId = null) {
  const settings = await getUserSettings(chatId, env);
  const text = buildSettingsText(settings);
  const keyboard = buildMainKeyboard(settings);

  if (messageId) {
    await editMessage(chatId, messageId, text, keyboard, env);
  } else {
    await sendMessage(chatId, text, env, { reply_markup: keyboard });
  }
}

function buildSettingsText(settings) {
  const level = LEVELS[settings.level || 'neutral'];
  const gender = settings.botGender === 'female' ? '👩 Female (Alex)' : '👨 Male (Alex)';
  const voiceStatus = settings.voiceMode ? '🔊 On' : '💬 Off';
  const topicsList = settings.topics?.length
    ? settings.topics.map(t => TOPICS[t]).join(', ')
    : '🗣 Everyday / No filter';

  return (
    `⚙️ <b>Settings</b>\n\n` +
    `🎙 <b>Voice replies:</b> ${voiceStatus}\n` +
    `🧑 <b>Bot voice:</b> ${gender}\n` +
    `📊 <b>English level:</b> ${level.label}\n` +
    `🎯 <b>Topics:</b> ${topicsList}`
  );
}

function buildMainKeyboard(settings) {
  return {
    inline_keyboard: [
      [
        {
          text: settings.voiceMode ? '🔊 Voice: ON' : '💬 Voice: OFF',
          callback_data: 'settings:toggle_voice'
        }
      ],
      [
        { text: '🧑 Bot Voice', callback_data: 'settings:menu:gender' },
        { text: '📊 My Level', callback_data: 'settings:menu:level' },
      ],
      [
        { text: '🎯 Topics', callback_data: 'settings:menu:topics' },
      ],
      [
        { text: '✅ Done', callback_data: 'settings:close' }
      ]
    ]
  };
}

// ─── Gender submenu ───────────────────────────────────────────────────────────

function buildGenderKeyboard(settings) {
  const cur = settings.botGender || 'male';
  return {
    inline_keyboard: [
      [
        {
          text: cur === 'male' ? '✅ 👨 Male (Alex)' : '👨 Male (Alex)',
          callback_data: 'settings:set:gender:male'
        },
        {
          text: cur === 'female' ? '✅ 👩 Female (Alex)' : '👩 Female (Alex)',
          callback_data: 'settings:set:gender:female'
        }
      ],
      [{ text: '← Back', callback_data: 'settings:menu:main' }]
    ]
  };
}

// ─── Level submenu ────────────────────────────────────────────────────────────

function buildLevelKeyboard(settings) {
  const cur = settings.level || 'neutral';
  const rows = Object.entries(LEVELS).map(([key, { label }]) => ([{
    text: cur === key ? `✅ ${label}` : label,
    callback_data: `settings:set:level:${key}`
  }]));
  rows.push([{ text: '← Back', callback_data: 'settings:menu:main' }]);
  return { inline_keyboard: rows };
}

// ─── Topics submenu ───────────────────────────────────────────────────────────

function buildTopicsKeyboard(settings) {
  const selected = settings.topics || [];

  // Two columns
  const topicEntries = Object.entries(TOPICS);
  const rows = [];
  for (let i = 0; i < topicEntries.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, topicEntries.length); j++) {
      const [key, label] = topicEntries[j];
      const isOn = selected.includes(key);
      row.push({
        text: isOn ? `✅ ${label}` : label,
        callback_data: `settings:toggle:topic:${key}`
      });
    }
    rows.push(row);
  }

  rows.push([
    {
      text: selected.length ? '🗑 Clear all topics' : '🗣 Everyday (no filter)',
      callback_data: 'settings:clear:topics'
    }
  ]);
  rows.push([{ text: '← Back', callback_data: 'settings:menu:main' }]);

  return { inline_keyboard: rows };
}

// ─── Callback handler ─────────────────────────────────────────────────────────

export async function handleSettingsCallback(query, env) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data; // e.g. "settings:set:level:b1"

  const settings = await getUserSettings(chatId, env);
  const parts = data.split(':'); // ['settings', action, ...]

  // settings:toggle_voice
  if (data === 'settings:toggle_voice') {
    settings.voiceMode = !settings.voiceMode;
    await setUserSettings(chatId, settings, env);
    await showSettings(chatId, env, messageId);
    return;
  }

  // settings:close
  if (data === 'settings:close') {
    await editMessage(chatId, messageId,
      buildSettingsText(settings) + '\n\n<i>Settings saved ✓</i>',
      null, env
    );
    return;
  }

  // settings:menu:X — show submenu
  if (parts[1] === 'menu') {
    const submenu = parts[2];
    let text, keyboard;

    if (submenu === 'main') {
      text = buildSettingsText(settings);
      keyboard = buildMainKeyboard(settings);
    } else if (submenu === 'gender') {
      text = '🧑 <b>Choose bot voice gender</b>\n\nThis changes the ElevenLabs voice used for replies.';
      keyboard = buildGenderKeyboard(settings);
    } else if (submenu === 'level') {
      text = '📊 <b>Your English level</b>\n\nI\'ll adjust my vocabulary and complexity accordingly.';
      keyboard = buildLevelKeyboard(settings);
    } else if (submenu === 'topics') {
      text = '🎯 <b>Favorite topics</b>\n\nSelect topics you\'d like to talk about. I\'ll steer conversations that way!\n\nYou can pick multiple, or leave empty for everyday chat.';
      keyboard = buildTopicsKeyboard(settings);
    }

    await editMessage(chatId, messageId, text, keyboard, env);
    return;
  }

  // settings:set:gender:X
  if (parts[1] === 'set' && parts[2] === 'gender') {
    settings.botGender = parts[3];
    await setUserSettings(chatId, settings, env);
    await editMessage(chatId, messageId,
      '🧑 <b>Choose bot voice gender</b>\n\nThis changes the ElevenLabs voice used for replies.',
      buildGenderKeyboard(settings), env
    );
    return;
  }

  // settings:set:level:X
  if (parts[1] === 'set' && parts[2] === 'level') {
    settings.level = parts[3];
    await setUserSettings(chatId, settings, env);
    await editMessage(chatId, messageId,
      '📊 <b>Your English level</b>\n\nI\'ll adjust my vocabulary and complexity accordingly.',
      buildLevelKeyboard(settings), env
    );
    return;
  }

  // settings:toggle:topic:X
  if (parts[1] === 'toggle' && parts[2] === 'topic') {
    const topic = parts[3];
    const idx = (settings.topics || []).indexOf(topic);
    if (idx === -1) {
      settings.topics = [...(settings.topics || []), topic];
    } else {
      settings.topics = settings.topics.filter(t => t !== topic);
    }
    await setUserSettings(chatId, settings, env);
    await editMessage(chatId, messageId,
      '🎯 <b>Favorite topics</b>\n\nSelect topics you\'d like to talk about. I\'ll steer conversations that way!\n\nYou can pick multiple, or leave empty for everyday chat.',
      buildTopicsKeyboard(settings), env
    );
    return;
  }

  // settings:clear:topics
  if (data === 'settings:clear:topics') {
    settings.topics = [];
    await setUserSettings(chatId, settings, env);
    await editMessage(chatId, messageId,
      '🎯 <b>Favorite topics</b>\n\nSelect topics you\'d like to talk about. I\'ll steer conversations that way!\n\nYou can pick multiple, or leave empty for everyday chat.',
      buildTopicsKeyboard(settings), env
    );
    return;
  }
}
