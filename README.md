[Русский](./README.md) | [English](./README-en.md) | [中文](./README-zh.md) | [日本語](./README-ja.md)  

# Learn Claude Code RUS — nano-агент в стиле Claude Code с русской адаптацией

<img width="260" src="https://github.com/user-attachments/assets/fe8b852b-97da-4061-a467-9694906b5edf" /><br>

WeChat: сканируйте QR на изображении выше,  
или X: [shareAI-Lab](https://x.com/baicai003)  

```
                    ПАТТЕРН АГЕНТА
                    =============

    User --> messages[] --> LLM --> response
                                      |
                            stop_reason == "tool_use"?
                           /                          \
                         yes                           no
                          |                             |
                    execute tools                    return text
                    append results
                    loop back -----------------> messages[]


    Это минимальный цикл. Любому coding-агенту он нужен.
    В продакшене добавляют политику, права и жизненный цикл.
```

**12 последовательных сессий — от простого цикла до изолированного автономного выполнения.**  
**В каждой сессии добавляется один механизм. У каждого механизма — свой девиз.**

> **s01** — *«Один цикл и Bash — всё, что нужно»* — один инструмент + один цикл = агент  
> **s02** — *«Новый инструмент = новый handler»* — цикл не меняется; инструменты регистрируются в dispatch map  
> **s03** — *«Агент без плана блуждает»* — сначала шаги, потом выполнение  
> **s04** — *«Дели большие задачи; у подзадачи свой чистый контекст»* — субагенты с отдельным `messages[]`  
> **s05** — *«Загружай знания по запросу, не заранее»* — через tool_result, не в system prompt  
> **s06** — *«Контекст заполнится — нужно освободить место»* — трёхуровневое сжатие для длинных сессий  
> **s07** — *«Цель делится на задачи, порядок, хранение на диске»* — граф задач с зависимостями  
> **s08** — *«Медленное — в фоне; агент продолжает думать»* — daemon threads и уведомления  
> **s09** — *«Одному не потянуть — делегируй коллегам»* — постоянные «тиммейты» + async mailboxes  
> **s10** — *«Коллегам нужны общие правила общения»* — один паттерн request–response для переговоров  
> **s11** — *«Сами смотрят доску и берут задачи»* — лид не назначает каждого вручную  
> **s12** — *«Каждый в своей директории, без помех»* — задачи и worktree связаны по ID  

---

## Ядро: цикл агента

```python
def agent_loop(messages):
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM,
            messages=messages, tools=TOOLS,
        )
        messages.append({"role": "assistant",
                         "content": response.content})

        if response.stop_reason != "tool_use":
            return

        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = TOOL_HANDLERS[block.name](**block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})
```

Каждая сессия накладывает один механизм на этот цикл — сам цикл не меняется.

## Ограничения (важно)

Репозиторий — учебный проект «с нуля до nano-агента». Упрощены или опущены продакшен-механизмы:

- Полные шины событий/hooks (PreToolUse, SessionStart/End и т.д.). В s12 — только минимальный append-only лог для обучения.  
- Правила прав доступа и доверия  
- Управление жизненным циклом сессии (resume/fork) и продвинутый lifecycle worktree  
- Полная реализация MCP (транспорт, OAuth, подписки на ресурсы)

Протокол JSONL-почты для команды в репозитории — учебная реализация, не описание конкретного продакшена.

## Быстрый старт

```sh
git clone https://github.com/rockot/learn-claude-code-rus
cd learn-claude-code-rus
pip install -r requirements.txt
copy .env.example .env   # Windows: скопируйте и укажите ANTHROPIC_API_KEY в .env

python agents/s01_agent_loop.py                 # начните здесь
python agents/s12_worktree_task_isolation.py    # финал прогрессии s01–s12
python agents/s_full.py                         # capstone: все механизмы вместе
```

### Веб-платформа

Интерактивные визуализации, пошаговые диаграммы, просмотр кода и документация. После запуска откройте в браузере **http://localhost:3000**.

**bash / macOS / Linux:**

```sh
cd web && npm install && npm run dev
```

**PowerShell (Windows):**

```powershell
cd web
npm install
npm run dev
```

Одной строкой:

```powershell
cd web; npm install; npm run dev
```

Если `npm install` уже выполнялся, достаточно:

```powershell
cd web; npm run dev
```

Перед `npm run dev` автоматически запускается `npm run extract` (скрипт собирает данные из `agents/` и `docs/`).

## Путь обучения

```
Фаза 1: ЦИКЛ                    Фаза 2: ПЛАН И ЗНАНИЯ
==============                  =====================
s01  Цикл агента        [1]     s03  TodoWrite               [5]
     while + stop_reason              TodoManager + напоминания
     |                                |
     +-> s02  Tool Use       [4]     s04  Subagents            [5]
              dispatch map              отдельный messages[] у дочернего
                                        |
                                   s05  Skills               [5]
                                        SKILL.md через tool_result
                                        |
                                   s06  Context Compact      [5]
                                        трёхуровневое сжатие

Фаза 3: ПЕРСИСТЕНТНОСТЬ          Фаза 4: КОМАНДЫ
====================            ===============
s07  Tasks                [8]   s09  Agent Teams             [9]
     CRUD на диске + граф            тиммейты + JSONL mailboxes
     |                              |
s08  Background Tasks      [6]   s10  Team Protocols          [12]
     фоновые потоки + очередь       shutdown + plan approval FSM
                                    |
                               s11  Autonomous Agents       [14]
                                    idle + auto-claim
                                    |
                               s12  Worktree Isolation      [16]
                                    задачи + изолированные директории

                                    [N] = число инструментов
```

## Структура репозитория

```
learn-claude-code/
|
|-- agents/                 # Python: s01–s12 + s_full (capstone)
|-- docs/{en,zh,ja}/        # Документация (3 языка)
|-- docs/rus/               # Дополнительные заметки на русском (локально)
|-- web/                    # Обучающая платформа (Next.js)
|-- skills/                 # Файлы навыков для s05
+-- .github/workflows/     # CI
```

## Документация

Формат: сначала проблема и модель, затем ASCII-схема и минимальный код.

Официальные языки: [English](./docs/en/) | [中文](./docs/zh/) | [日本語](./docs/ja/).  
Дополнительно на русском: [docs/rus/](./docs/rus/).

| Сессия | Тема | Девиз |
|--------|------|-------|
| [s01](./docs/en/s01-the-agent-loop.md) | Цикл агента | *One loop & Bash is all you need* |
| [s02](./docs/en/s02-tool-use.md) | Инструменты | *Adding a tool means adding one handler* |
| [s03](./docs/en/s03-todo-write.md) | TodoWrite | *An agent without a plan drifts* |
| [s04](./docs/en/s04-subagent.md) | Субагенты | *Break big tasks down...* |
| [s05](./docs/en/s05-skill-loading.md) | Skills | *Load knowledge when you need it...* |
| [s06](./docs/en/s06-context-compact.md) | Сжатие контекста | *Context will fill up...* |
| [s07](./docs/en/s07-task-system.md) | Задачи на диске | *Break big goals into small tasks...* |
| [s08](./docs/en/s08-background-tasks.md) | Фоновые задачи | *Run slow operations in the background...* |
| [s09](./docs/en/s09-agent-teams.md) | Команды агентов | *When the task is too big for one...* |
| [s10](./docs/en/s10-team-protocols.md) | Протоколы команды | *Teammates need shared communication rules* |
| [s11](./docs/en/s11-autonomous-agents.md) | Автономные агенты | *Teammates scan the board...* |
| [s12](./docs/en/s12-worktree-task-isolation.md) | Worktree + изоляция | *Each works in its own directory...* |

## Дальше — от понимания к продукту

После 12 сессий вы понимаете устройство агента изнутри. Два направления применения:

### Kode Agent CLI

> `npm i -g @shareai-lab/kode`

Поддержка skills и LSP, Windows, подключение GLM / MiniMax / DeepSeek и др.

GitHub: **[shareAI-lab/Kode-cli](https://github.com/shareAI-lab/Kode-cli)**

### Kode Agent SDK

Официальный Claude Code Agent SDK общается с полноценным CLI-процессом. Kode SDK — библиотека без отдельного процесса на пользователя, для бэкендов, расширений браузера и т.д.

GitHub: **[shareAI-lab/Kode-agent-sdk](https://github.com/shareAI-lab/Kode-agent-sdk)**

---

## Смежный репозиторий: от «сессии по запросу» к «всегда включённому» ассистенту

Агент из этого курса — **одноразовый**: открыл терминал, дал задачу, закрыл — следующая сессия с чистого листа. Так устроен модель Claude Code.

[OpenClaw](https://github.com/openclaw/openclaw) показывает другой вариант: поверх того же ядра два механизма превращают агента из «пни — заработает» в «каждые 30 секунд проверяет, есть ли работа»:

- **Heartbeat** — раз в 30 с система шлёт сообщение; нечего делать — сон, есть задача — действуй.  
- **Cron** — агент может запланировать свои будущие задачи.

Плюс мультиканальные мессенджеры, память контекста, «личность» — и агент становится постоянным помощником.

**[claw0](https://github.com/shareAI-lab/claw0)** — учебный репозиторий, разбирающий эти механизмы с нуля:

```
claw agent = ядро агента + heartbeat + cron + IM + память + soul
```

```
learn-claude-code                   claw0
(ядро агента:                        (всегда включённый ассистент:
 цикл, инструменты, планирование,    heartbeat, cron, каналы IM,
 команды, worktree)                  память, личность)
```

## Лицензия

MIT

---

**Модель и есть агент. Наша задача — дать инструменты и не мешать.**
