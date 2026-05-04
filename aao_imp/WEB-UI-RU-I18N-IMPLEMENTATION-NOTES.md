# Русификация web UI: что сделано и как проверить

Этот документ фиксирует внесённые изменения по русификации web UI в `learn-claude-code-main` и даёт короткую инструкцию по локальной проверке.

---

## Как запустить локально

Из корня репозитория:

```powershell
cd web
npm install
npm run dev
```

Если зависимости уже установлены:

```powershell
cd web
npm run dev
```

После запуска открыть в браузере:

- `http://localhost:3000/ru`
- `http://localhost:3000/ru/timeline`
- `http://localhost:3000/ru/s01`
- `http://localhost:3000/ru/s08`
- `http://localhost:3000/ru/s09`

Важно:

- перед `npm run dev` автоматически запускается `npm run extract`;
- маршрут `/` по-прежнему редиректит на `/en/`, это ожидаемое поведение;
- переключение на русский идёт через language switch в header.

---

## Как быстро проверить

### 1. Проверка сборки

Из папки `web`:

```powershell
cmd /c "npm run build"
```

Сборка должна проходить без ошибок. Эта проверка уже была выполнена после внесённых изменений.

### 2. Проверка локали `ru`

Открыть `/ru` и убедиться, что:

- header показывает переключатель `RU`;
- названия разделов, кнопки и подписи интерфейса отображаются по-русски;
- карточки версий, timeline, compare, layers и version page используют русские подписи.

### 3. Проверка tutorial fallback

Открыть:

- `/ru/s01` — должен быть русский tutorial;
- `/ru/s08` — должен быть русский tutorial;
- `/ru/s09` — tutorial должен подхватиться на английском, потому что для `s09–s12` в `docs/rus` пока нет отдельных файлов.

### 4. Проверка annotations

На странице версии открыть вкладку `Deep Dive` и проверить блок `Архитектурные решения`:

- `title` и `description` должны быть на русском;
- блок `alternatives` пока остаётся на английском по плану.

### 5. Проверка simulator и visualizations

На `/ru/s01`:

- вкладка симулятора должна иметь русские UI-кнопки и подписи;
- для demo-сценария должна показываться пометка, что содержимое сценария пока на английском;
- для visualizations должна показываться пометка, что внутренние подписи диаграмм пока на английском.

---

## Что изменено

### 1. Подключена локаль `ru`

Добавлены изменения в:

- `web/src/lib/i18n.tsx`
- `web/src/lib/i18n-server.ts`
- `web/src/app/[locale]/layout.tsx`
- `web/src/components/layout/header.tsx`

Что это дало:

- появился маршрут `/ru`;
- локаль `ru` попала в maps сообщений и static params;
- в header появился переключатель `RU`.

### 2. Добавлен русский файл сообщений

Создан файл:

- `web/src/i18n/messages/ru.json`

В нём добавлены:

- базовые UI-строки;
- `sessions`;
- `layer_labels`;
- `subtitles`;
- `core_additions`;
- `key_insights`;
- подписи для simulator;
- подписи и пометки для visualizations.

### 3. Локализованы version metadata

Добавлен helper:

- `web/src/lib/version-meta.ts`

Он даёт единый способ получать локализованные:

- `title`
- `subtitle`
- `coreAddition`
- `keyInsight`
- label слоя

с fallback на `VERSION_META`, если перевода нет.

### 4. Убраны оставшиеся важные хардкоды

Обновлены страницы и компоненты:

- `web/src/app/[locale]/page.tsx`
- `web/src/components/timeline/timeline.tsx`
- `web/src/app/[locale]/(learn)/layers/page.tsx`
- `web/src/app/[locale]/(learn)/compare/page.tsx`
- `web/src/app/[locale]/(learn)/[version]/page.tsx`
- `web/src/app/[locale]/(learn)/[version]/diff/diff-content.tsx`
- `web/src/components/simulator/agent-loop-simulator.tsx`
- `web/src/components/simulator/simulator-message.tsx`
- `web/src/components/visualizations/index.tsx`
- `web/src/components/visualizations/shared/step-controls.tsx`

Итог:

- основные UI-элементы и state/messages стали русифицируемыми;
- сценарии и visualizations не переведены целиком, но в UI есть явные пометки об этом.

### 5. Подключён `docs/rus` как источник для `/ru`

Изменены:

- `web/scripts/extract-content.ts`
- `web/src/types/agent-data.ts`

Что сделано:

- папка `docs/rus` читается как локаль `ru`;
- тип `DocContent.locale` расширен до `"ru"`;
- generated `docs.json` теперь содержит русские tutorial entries.

### 6. Устранены дубли `s01` и `s02` в `docs/rus`

Обновлены:

- `docs/rus/s01-kak-rabotaet-agent.md`
- `docs/rus/s02-kak-rabotaet-tool-use.md`

Удалены дубли:

- `docs/rus/s01-kak-llm-zapuskaet-bash.md`
- `docs/rus/s02-kak-model-vybiraet-instrument.md`

Итог:

- в extraction больше нет двух файлов на одну и ту же `(version, locale)` пару;
- выбор tutorial для `s01` и `s02` стал детерминированным.

### 7. Добавлены русские annotations

Обновлены:

- `web/src/data/annotations/s01.json`
- `web/src/data/annotations/s02.json`
- `web/src/data/annotations/s03.json`
- `web/src/data/annotations/s04.json`
- `web/src/data/annotations/s05.json`
- `web/src/data/annotations/s06.json`
- `web/src/data/annotations/s07.json`
- `web/src/data/annotations/s08.json`
- `web/src/data/annotations/s09.json`
- `web/src/data/annotations/s10.json`
- `web/src/data/annotations/s11.json`
- `web/src/data/annotations/s12.json`

И также:

- `web/src/components/architecture/design-decisions.tsx`

Что сделано:

- в каждый decision добавлены `ru.title` и `ru.description`;
- компоненту добавлен тип `ru?: { title; description }`;
- `alternatives` намеренно не переводились и остаются английским fallback.

---

## Что осталось частично английским

Это не баг, а ожидаемое состояние по согласованному плану:

- tutorial для `s09–s12` — fallback на EN;
- `alternatives` в annotations — EN;
- содержимое `scenarios/*.json` — EN, в UI добавлена пометка;
- внутренние подписи в visualizations — EN, в UI добавлена пометка.

---

## Проверка, которая уже была выполнена

После внесения изменений успешно выполнено:

```powershell
cd web
cmd /c "npm run build"
```

Что это подтвердило:

- `extract-content.ts` корректно собирает данные по `ru`;
- TypeScript типы согласованы;
- Next.js build проходит;
- маршруты `/ru`, `/ru/timeline`, `/ru/compare`, `/ru/layers`, `/ru/[version]`, `/ru/[version]/diff` генерируются.

---

## Короткий итог

Сейчас в проекте уже есть рабочий русский web UI с:

- переключением языка в интерфейсе;
- русскими маршрутами `/ru/...`;
- русскими tutorial-разделами для `s01–s08`;
- fallback на английский для непокрытых tutorial sections `s09–s12`;
- русскими annotations;
- частично локализованными simulator/visualizations через UI-обвязку и явные пометки.
