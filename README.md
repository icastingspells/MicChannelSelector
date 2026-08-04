# MicChannelSelector

Vencord-плагин для выбора канала стереофонического микрофона, который будет передаваться в Discord.

Полезен, например, если аудиоинтерфейс передаёт микрофон и другой источник раздельно:

```text
Audient iD4
├── Left  → 🎙️ Microphone
└── Right → 🎸 Guitar
```

## Возможности

Плагин поддерживает три режима:

- **Left** — использует только левый канал и дублирует его в L/R.
- **Right** — использует только правый канал и дублирует его в L/R.
- **Stereo** — передаёт оба канала без обработки.

Настройка доступна непосредственно в настройках Vencord:

```text
Settings → Vencord → Plugins → MicChannelSelector
```

## Пример

При выборе **Left**:

```text
L 🎙️ ──┬──→ Discord L
       └──→ Discord R

R 🎸 ──X
```

При выборе **Right**:

```text
L 🎙️ ──X

R 🎸 ──┬──→ Discord L
       └──→ Discord R
```

## Установка

Поместите плагин в:

```text
src/userplugins/MicChannelSelector/index.ts
```

Затем соберите Vencord:

```bash
pnpm build
```

После перезапуска Vesktop включите **MicChannelSelector** в настройках Vencord.

> При изменении канала рекомендуется заново подключиться к голосовому каналу, чтобы Discord повторно запросил аудиопоток.

## Требования

- Vencord
- Vesktop или другой клиент с поддержкой Vencord
- Стереофонический источник аудио

Плагин использует **Web Audio API** для разделения и маршрутизации каналов.

## Known Issues 
- Now works only in Vesktop and Web version of Discord
