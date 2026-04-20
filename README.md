# English Practice Telegram Bot

Telegram бот для тренировки английского. Работает на Cloudflare Workers (бесплатно).

## Стек

| Компонент | Сервис | Лимит |
|---|---|---|
| Хостинг | Cloudflare Workers | 100k req/день — бесплатно |
| LLM | Gemini 2.0 Flash | 1500 req/день — бесплатно |
| STT (голос→текст) | Groq Whisper | ~2ч аудио/день — бесплатно |
| TTS основной | ElevenLabs | 10k символов/мес — бесплатно |
| TTS fallback | Google Translate TTS | безлимит — бесплатно |
| История чатов | Cloudflare KV | 100k reads/день — бесплатно |

---

## Установка

### 1. Получи все API ключи

- **Telegram**: напиши [@BotFather](https://t.me/BotFather) → `/newbot` → получи токен
- **Gemini**: [aistudio.google.com](https://aistudio.google.com) → Get API key
- **Groq**: [console.groq.com](https://console.groq.com) → API Keys → Create
- **ElevenLabs** (опционально): [elevenlabs.io](https://elevenlabs.io) → Profile → API Key

### 2. Установи Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 3. Создай KV namespace

```bash
wrangler kv:namespace create "KV"
```

Скопируй полученный `id` и вставь в `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "KV"
id = "ВСТАВЬ_ID_СЮДА"
```

### 4. Добавь секреты

```bash
wrangler secret put TELEGRAM_TOKEN
wrangler secret put GEMINI_API_KEY
wrangler secret put GROQ_API_KEY
wrangler secret put ELEVENLABS_API_KEY   # опционально
```

### 5. Задеплой

```bash
wrangler deploy
```

После деплоя Wrangler покажет URL вида:
`https://english-bot.YOUR_SUBDOMAIN.workers.dev`

### 6. Установи webhook

Замени `YOUR_TOKEN` и `YOUR_WORKER_URL` и открой в браузере:

```
https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=YOUR_WORKER_URL
```

Или через curl:
```bash
curl "https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=YOUR_WORKER_URL"
```

Должно вернуть: `{"ok":true,"result":true}`

---

## Использование

| Команда | Действие |
|---|---|
| `/start` | Начать, бот поздоровается и задаст вопрос |
| `/voice` | Включить/выключить голосовые ответы |
| `/new` | Начать новый разговор |
| `/help` | Помощь |

- Пиши по-английски — бот отвечает и исправляет ошибки
- Отправь голосовое — бот транскрибирует, ответит и исправит
- При включённом `/voice` ответы озвучиваются

---

## Структура проекта

```
src/
  index.js          — точка входа, роутинг апдейтов
  telegram.js       — Telegram Bot API хелперы
  gemini.js         — Gemini LLM (системный промпт, история)
  tts.js            — TTS: ElevenLabs → gTTS fallback
  stt.js            — STT: Groq Whisper
  storage.js        — история чата и настройки в KV
  handlers/
    message.js      — текстовые сообщения и команды
    voice.js        — голосовые сообщения
    callback.js     — inline кнопки (задел на будущее)
wrangler.toml       — конфиг Cloudflare Workers
```
