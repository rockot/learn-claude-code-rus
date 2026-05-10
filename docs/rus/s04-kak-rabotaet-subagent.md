# Как работает s04: Subagents

s04 добавляет **субагентов**: родительский агент делегирует подзадачи дочернему агенту с **отдельным контекстом**. В родительский диалог возвращается только краткое резюме, а вся история субагента отбрасывается.

---

## Проблема

По мере работы агента `messages` растёт: каждый `read_file`, каждый вывод bash остаётся в контексте. Для вопроса «Какой фреймворк тестов используется?» может понадобиться прочитать 5 файлов, но родителю нужен только ответ: «pytest».

---

## Решение

```
Родительский агент              Субагент
+------------------+            +------------------+
| messages=[...]   |            | messages=[]      |  ← новый контекст
|                  |  dispatch  |                  |
| tool: task       | ---------> | while tool_use:  |
|   prompt="..."   |            |   call tools     |
|                  |  summary   |   append results |
|   result = "..." | <--------- | return last text |
+------------------+            +------------------+

Контекст родителя остаётся компактным. Контекст субагента отбрасывается.
```

---

## 1. Инструмент task (строки 138–141)

Родитель получает базовые инструменты **плюс** `task`:

```python
PARENT_TOOLS = CHILD_TOOLS + [
    {"name": "task",
     "description": "Spawn a subagent with fresh context. It shares the filesystem but not conversation history.",
     "input_schema": {"properties": {"prompt": {"type": "string"}, "description": {"type": "string"}}, "required": ["prompt"]}},
]
```

Субагент получает только `CHILD_TOOLS` (bash, read_file, write_file, edit_file) — **без** `task`, чтобы не было рекурсивного создания агентов.

---

## 2. Функция run_subagent (строки 117–135)

```python
def run_subagent(prompt: str) -> str:
    sub_messages = [{"role": "user", "content": prompt}]  # чистый контекст
    for _ in range(30):  # лимит итераций
        response = client.messages.create(
            model=MODEL, system=SUBAGENT_SYSTEM, messages=sub_messages,
            tools=CHILD_TOOLS, max_tokens=8000,
        )
        sub_messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            break
        # ... выполнение инструментов, добавление results в sub_messages
    return "".join(b.text for b in response.content if hasattr(b, "text")) or "(no summary)"
```

Что происходит:

- Создаётся новый `sub_messages` с одним сообщением пользователя.
- Субагент работает в своём цикле (до 30 итераций).
- Используется отдельный системный промпт: `SUBAGENT_SYSTEM`.
- В родителя возвращается только **текст последнего ответа** (резюме).
- Вся история субагента (все tool_use и tool_result) не попадает в родительский контекст.

---

## 3. Обработка в родительском цикле (строки 156–165)

```python
if block.name == "task":
    output = run_subagent(block.input["prompt"])
else:
    output = handler(**block.input)
results.append({"type": "tool_result", "tool_use_id": block.id, "content": str(output)})
```

Для родителя вызов `task` выглядит как обычный инструмент: он получает `tool_result` с текстом резюме субагента.

---

## 4. Системные промпты

**Родитель** (строка 43):
```python
SYSTEM = "You are a coding agent at {WORKDIR}. Use the task tool to delegate exploration or subtasks."
```

**Субагент** (строка 44):
```python
SUBAGENT_SYSTEM = "You are a subagent at {WORKDIR}. Complete the given task, then summarize your findings."
```

Субагент явно просят завершить задачу и дать резюме.

---

## 5. Схема потока

```
1. Пользователь: "Use a subtask to find what testing framework this project uses"
2. Родитель вызывает task(prompt="Find what testing framework this project uses. Read relevant files and return only the answer.")
3. run_subagent() создаёт sub_messages = [user: prompt]
4. Субагент: read_file("pyproject.toml"), read_file("requirements.txt"), ...
5. Субагент завершает цикл, возвращает текст: "This project uses pytest."
6. Родитель получает tool_result: "This project uses pytest."
7. В родительском messages — только этот короткий текст, а не все прочитанные файлы
```

---

## 6. Изоляция контекста

| Аспект | Родитель | Субагент |
|--------|----------|----------|
| messages | Накопленная история | Только prompt + своя работа |
| Инструменты | base + task | Только base (без task) |
| Возврат | — | Только текст последнего ответа |
| Файловая система | Общая | Общая (тот же WORKDIR) |

---

## Итог

- **task** — инструмент родителя для делегирования подзадач.
- **run_subagent** — запускает агента с новым `messages` и возвращает только резюме.
- **Изоляция контекста** — родитель не видит все tool_use субагента.
- **Общая файловая система** — субагент работает в том же каталоге.
- **Без рекурсии** — у субагента нет `task`, он не может создавать новых субагентов.

---

## Попробуй сам

```sh
cd learn-claude-code
python agents/s04_subagent.py
```

1. `Используй подзадачу и выясни, какой тестовый фреймворк используется в проекте`
2. `Делегируй: прочитай все .py-файлы и кратко опиши, что делает каждый`
3. `Используй task для создания нового модуля, затем проверь его из родительского агента`
