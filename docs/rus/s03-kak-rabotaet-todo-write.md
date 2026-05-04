# Как работает s03: TodoWrite

s03 добавляет **планирование** и **отслеживание прогресса**: агент ведёт список задач и получает напоминания, если перестаёт его обновлять.

---

## Проблема

На многошаговых задачах модель может:
- забывать шаги;
- повторять уже сделанное;
- пропускать шаги;
- уходить в сторону.

Чем длиннее диалог, тем больше контекста занимают результаты инструментов, и системный промпт «размывается».

---

## Решение

1. **TodoManager** — хранит список задач и их статусы.
2. **Инструмент `todo`** — модель обновляет список через этот инструмент.
3. **Nag reminder** — если модель 3+ раунда подряд не вызывает `todo`, в контекст добавляется напоминание.

---

## 1. TodoManager (строки 53–86)

```python
class TodoManager:
    def update(self, items: list) -> str:
        # Валидация: max 20 задач, только один in_progress
        # ...
        self.items = validated
        return self.render()
```

**Правила:**
- Не больше 20 задач.
- Только одна задача может быть `in_progress`.
- Статусы: `pending`, `in_progress`, `completed`.

**Формат задачи:** `{id, text, status}`.

**Вывод (render):**
```
[ ] #1: Прочитать hello.py
[>] #2: Добавить type hints  ← текущая
[x] #3: Добавить docstring

(1/3 completed)
```

---

## 2. Инструмент todo (строки 145, 157–158)

```python
"todo": lambda **kw: TODO.update(kw["items"]),
```

Модель вызывает `todo` с массивом `items`. `TodoManager.update()` проверяет данные, сохраняет их и возвращает строку с текущим списком. Эта строка попадает в `tool_result` и в контекст следующего вызова LLM.

---

## 3. Nag reminder (строки 164, 175–189)

```python
rounds_since_todo = 0
# ...
for block in response.content:
    if block.type == "tool_use":
        # ...
        if block.name == "todo":
            used_todo = True
rounds_since_todo = 0 if used_todo else rounds_since_todo + 1
if rounds_since_todo >= 3:
    results.insert(0, {"type": "text", "text": "<reminder>Update your todos.</reminder>"})
```

- `rounds_since_todo` — сколько раундов подряд модель не вызывала `todo`.
- Если вызывала `todo` — счётчик обнуляется.
- Если 3 раунда подряд не вызывала — в начало `results` добавляется текст-напоминание.
- Это напоминание уходит в `messages` как часть следующего пользовательского сообщения и подталкивает модель обновить список задач.

---

## 4. Системный промпт (строки 47–49)

```python
SYSTEM = """You are a coding agent at {WORKDIR}.
Use the todo tool to plan multi-step tasks. Mark in_progress before starting, completed when done.
Prefer tools over prose."""
```

Модель явно просят:
- планировать многошаговые задачи через `todo`;
- помечать задачу `in_progress` перед началом и `completed` по завершении;
- предпочитать вызовы инструментов длинным текстовым объяснениям.

---

## 5. Схема потока

```
1. Пользователь: "Refactor hello.py: add type hints, docstrings, main guard"
2. Модель вызывает todo с планом:
   [{id: "1", text: "Read hello.py", status: "pending"},
    {id: "2", text: "Add type hints", status: "pending"},
    ...]
3. TodoManager сохраняет, возвращает отрендеренный список
4. Модель вызывает read_file("hello.py")
5. Модель вызывает todo: #1 completed, #2 in_progress
6. Модель редактирует файл...
7. Если 3 раунда без todo → в контекст добавляется <reminder>Update your todos.</reminder>
```

---

## 6. Ограничение «один in_progress»

Только одна задача может быть `in_progress`. Это заставляет модель:
- фокусироваться на одной задаче;
- явно переключать статусы: `pending` → `in_progress` → `completed`;
- не «размазывать» внимание по нескольким задачам.

---

## Итог

- **TodoManager** — хранит и отображает список задач.
- **Инструмент `todo`** — единственный способ модели обновлять этот список.
- **Nag reminder** — напоминание обновлять список, если модель долго его не трогает.
- **Один in_progress** — принудительная последовательная работа по задачам.
