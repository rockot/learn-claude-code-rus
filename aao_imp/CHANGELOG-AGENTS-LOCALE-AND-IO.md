# Журнал доработок: агенты, локаль, кодировки

Папка `aao_imp` — рабочие заметки по репозиторию `learn-claude-code-main` (не часть upstream). Здесь зафиксировано, **что уже сделано в коде/доках** и **что осталось сделать** для единообразной кодировки subprocess и файлов.

---

## Уже сделано (в репозитории)

### 1. Сессия s08 — API Anthropic (ошибка 400 prefill)

**Проблема:** перед `messages.create` в историю добавлялись два сообщения: `user` с `<background-results>` и сразу `assistant` с текстом *Noted background results.* У части моделей запрос с **последним сообщением от assistant** даёт `invalid_request_error` (*assistant message prefill* / *conversation must end with a user message*).

**Исправление:** в [`agents/s08_background_tasks.py`](../agents/s08_background_tasks.py) синтетическое сообщение ассистента убрано; результаты фона идут **одним** `user`-сообщением (с краткой пометкой в том же блоке).

**Документы:** обновлены [`docs/en/s08-background-tasks.md`](../docs/en/s08-background-tasks.md), [`docs/rus/s08-fonovye-zadachi-polnoe-rukovodstvo.md`](../docs/rus/s08-fonovye-zadachi-polnoe-rukovodstvo.md).

### 2. Сессия s08 — вывод subprocess (кракозябры в Windows)

**Проблема:** `subprocess.run(..., text=True)` на русской Windows часто неверно декодирует вывод **cmd.exe** (OEM cp866 и т.п.).

**Исправление:** в том же [`s08_background_tasks.py`](../agents/s08_background_tasks.py) захват идёт с `text=False`, затем декодирование с цепочкой: `utf-8`, `utf-8-sig`, `cp866`, `cp1251`, `cp1252`, `latin-1`, иначе `utf-8` с `errors="replace"`. Используется и в фоновом `_execute`, и в `run_bash`.

### 3. Русскоязычный разбор s08

Добавлен связный материал: [`docs/rus/s08-fonovye-zadachi-polnoe-rukovodstvo.md`](../docs/rus/s08-fonovye-zadachi-polnoe-rukovodstvo.md) (смысл s08, tools vs skills, откуда берётся «понимание» фона, ограничения учебной версии).

### 4. План русификации веб-UI

Сохранён в этой же папке: [`web-ui-russian-i18n-plan.md`](web-ui-russian-i18n-plan.md).

---

## Рекомендовано сделать дальше (код — в Agent mode)

Ниже пункты **ещё не сведены в общий модуль** для всех файлов в `agents/`; при появлении доступа к правкам не-markdown файлов их стоит выполнить одним проходом.

### A. Общий модуль subprocess

- **Создать** [`agents/shell_util.py`](../agents/shell_util.py) с:
  - `decode_process_bytes(data: bytes | None) -> str` — та же цепочка кодировок, что сейчас в s08;
  - `run_decoded(cmd, *, cwd=, timeout=, shell=None) -> DecodedRun` с полями `stdout`, `stderr`, `returncode`; для `cmd: str` по умолчанию `shell=True`, для `list` — `shell=False` (вызовы `git`).
- **Подключить** во всех скриптах с `subprocess.run(..., capture_output=True, text=True)`:
  - [`s01_agent_loop.py`](../agents/s01_agent_loop.py) … [`s07_task_system.py`](../agents/s07_task_system.py), [`s09_agent_teams.py`](../agents/s09_agent_teams.py), [`s10_team_protocols.py`](../agents/s10_team_protocols.py), [`s11_autonomous_agents.py`](../agents/s11_autonomous_agents.py), [`s_full.py`](../agents/s_full.py) (в т.ч. `BackgroundManager._exec`), [`s12_worktree_task_isolation.py`](../agents/s12_worktree_task_isolation.py) (`detect_repo_root`, `_run_git`, `git status`, `worktree.run`, глобальный `run_bash`).
- **Рефакторинг s08:** удалить локальные `_decode_shell_bytes` / `_run_shell_capture`, импортировать из `shell_util`.

Подробный чеклист файлов был в плане `agents_subprocess_encoding` (Cursor plans).

### B. Создаваемые и читаемые файлы — явный UTF-8

На Windows `Path.read_text()` / `Path.write_text()` без `encoding` опираются на локаль по умолчанию; текст на русском или смешанный с JSON может открываться в редакторе «кракозябрами», если записан в одной кодировке, а читается как другая.

**Правило:** для всех текстовых артефактов агента (исходники, заметки, JSON задач, jsonl почты, транскрипты) использовать **`encoding="utf-8"`** явно.

Где править (поиск по репозиторию в `agents/`):

| Паттерн | Замена (идея) |
|--------|----------------|
| `.read_text()` | `.read_text(encoding="utf-8")` (если ещё нет `encoding=`) |
| `.write_text(x)` | `.write_text(x, encoding="utf-8")` |
| `open(path, "w")` / `"a"` для текста | `encoding="utf-8"` |

Файлы с нетривиальным I/O: [`s02_tool_use.py`](../agents/s02_tool_use.py) … [`s08_background_tasks.py`](../agents/s08_background_tasks.py), [`s09`–`s12`](../agents/), [`s_full.py`](../agents/s_full.py), [`s06_context_compact.py`](../agents/s06_context_compact.py) (транскрипты `open(..., "w")`), блоки inbox/config/task JSON.

В [`s12_worktree_task_isolation.py`](../agents/s12_worktree_task_isolation.py) часть уже с `utf-8` (например EventBus) — остальное выровнять к тому же стилю.

**Исключения:** бинарные файлы агентом не пишутся в учебных сессиях; если появятся — не форсировать UTF-8.

---

## Заметка про `sleep` в Windows cmd

Сообщение вида *«sleep не является внутренней или внешней командой»* — не кодировка, а отсутствие утилиты. Для проверки фона в cmd использовать, например, `timeout /t 5 /nobreak` или `ping -n 6 127.0.0.1 >nul`.

---

## Как проверить после внедрения A + B

1. Из корня репо: `python -c "import sys; sys.path.insert(0,'agents'); import shell_util"` (после появления модуля).
2. Запуск `python agents/s08_background_tasks.py` (или s02) с командой, дающей русский вывод в stderr.
3. Создать через агента файл с кириллицей и открыть в VS Code / Блокноте — должен быть UTF-8.

---

*Обновлено: фиксация состояния и оставшихся шагов; полные правки `.py` выполнять в режиме Agent, когда разрешены правки не только markdown.*
