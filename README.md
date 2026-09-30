# English Practice Telegram Bot

Telegram бот для тренировки английского. Работает на Cloudflare Workers (бесплатно).

## Стек

| Компонент | Сервис | Лимит |
|---|---|---|
| Хостинг | Cloudflare Workers | 100k req/день — бесплатно |
| LLM | Groq Llama 3.3 70B | бесплатно |
| STT (голос→текст) | Groq Whisper | ~2ч аудио/день — бесплатно |
| TTS основной | ElevenLabs | 10k символов/мес — бесплатно |
| TTS fallback | Google Translate TTS | безлимит — бесплатно |
| История чатов | Cloudflare KV | 100k reads/день — бесплатно |

---

## Установка

### 1. Получи все API ключи

- **Telegram**: напиши [@BotFather](https://t.me/BotFather) → `/newbot` → получи токен
- **Groq**: [console.groq.com](https://console.groq.com) → API Keys → Create
- **ElevenLabs** (опционально): [elevenlabs.io](https://elevenlabs.io) → Profile → API Key

### 2. Установи Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 3. Создай KV namespace

```bash
wrangler kv namespace create "KV"
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
wrangler secret put GROQ_API_KEY
wrangler secret put ELEVENLABS_API_KEY   # опционально
wrangler secret put TELEGRAM_WEBHOOK_SECRET   # случайная строка (A-Z a-z 0-9 _ -) для защиты webhook
```

### 5. Задеплой

```bash
wrangler deploy
```

После деплоя Wrangler покажет URL вида:
`https://english-bot.YOUR_SUBDOMAIN.workers.dev`

### 6. Установи webhook

Замени `YOUR_TOKEN`, `YOUR_WORKER_URL` и `YOUR_SECRET` (тот же, что в `TELEGRAM_WEBHOOK_SECRET`) и открой в браузере:

```
https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=YOUR_WORKER_URL&secret_token=YOUR_SECRET
```

Или через curl:
```bash
curl "https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=YOUR_WORKER_URL&secret_token=YOUR_SECRET"
```

Должно вернуть: `{"ok":true,"result":true}`

---

## Использование

| Команда | Действие |
|---|---|
| `/start` | Начать, бот поздоровается и задаст вопрос |
| `/settings` | Настройки: уровень, темы, голос бота |
| `/voice` | Включить/выключить голосовые ответы |
| `/new` | Начать новый разговор |
| `/help` | Помощь |

- Пиши по-английски — бот отвечает и исправляет ошибки
- Отправь голосовое — бот транскрибирует, ответит и исправит
- При включённом `/voice` ответы озвучиваются

---

## Структура проекта

```
index.js          — точка входа, роутинг апдейтов
message.js        — текстовые сообщения и команды
voice.js          — голосовые сообщения
callback.js       — inline-кнопки (настройки)
telegram.js       — Telegram Bot API хелперы
groq.js           — LLM: Groq Llama 3.3 70B (системный промпт, история)
stt.js            — STT: Groq Whisper
tts.js            — TTS: ElevenLabs → gTTS fallback
storage.js        — история чата и настройки в KV
settings.js       — меню настроек (уровень, темы, голос бота)
responseMode.js   — адаптивный режим ответа (авто/закреплённый)
wrangler.toml     — конфиг Cloudflare Workers
```
