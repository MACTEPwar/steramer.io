# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository is pre-implementation: there is no application code yet, no package.json, and no build/lint/test tooling configured. It currently holds Figma design exports and a Figma MCP integration used to drive implementation from mockups. When source code is added, this file should be updated with real build/lint/test commands and architecture notes.

## Planned stack

- Backend: NestJS
- Web frontend: Angular
- Mobile (Android/iOS) and desktop: Angular + Electron
- Database: MySQL
- ORM: Prisma

## Repository structure

This repo (`steramer.io`) is the umbrella repository: project docs, Figma design source, and cross-cutting conventions (this file, `.claude/agents/`). Application code lives in two separate repositories, wired in here as git submodules:

- `backend/` → [MACTEPwar/streamer.API](https://github.com/MACTEPwar/streamer.API) — NestJS API
- `frontend/` → [MACTEPwar/stream.Front](https://github.com/MACTEPwar/stream.Front) — Angular app

Each submodule is its own git repository with its own history and remote — commit and push inside `backend/`/`frontend/` separately, then commit the resulting pointer update in the umbrella repo. After cloning `steramer.io` fresh, run `git submodule update --init --recursive` to pull their content.

## Figma design source

- `docs/figma/*.json` — JSON exports of Figma frames/components, produced with the "Figma to JSON Exporter" community plugin (run from within Figma via Quick Actions), not the Figma REST API. These are the primary source of truth for UI/layout/styling before corresponding code exists. Current files: `tournament1.json`, `tournament2.json`, `main1.json`, `main2.json`, `news1.json`, `news2.json`, `news3.json`, `news4_detail_modal.json`.
- `figma.md` — index of Figma frame links grouped by site page (главная, новости, ...), each with its `fileKey`/`node-id` and a checkbox to track whether it's been processed into code.
- `.mcp.json` — registers the `figma-developer-mcp` MCP server (via `npx figma-developer-mcp`), giving direct read access to the Figma file via `get_figma_data` / `download_figma_images`. The API key is read from the `FIGMA_API_KEY` environment variable (user-level, set outside the repo) — never hardcode the token into `.mcp.json` or any tracked file.
- The Figma REST API is on a rate-limited starter plan — if `get_figma_data` returns 429, fall back to the JSON files already exported into `docs/figma/` instead of retrying the API.

## Available skills

`.claude/skills/` in this repo:

- `ccpm` (community, [automazeio/ccpm](https://github.com/automazeio/ccpm), synced manually — not auto-updating) — spec-driven project management skill. **Scope limited in this repo**: its own PRD/Epic/Sync/Execute/Track phases and local file conventions (`.claude/prds/`, `.claude/epics/`) are **not** the task tracker here — that's the GitHub Projects board (see "Статусы задач и ответственные" below). Use ccpm only as reference for phrasing (PRD-style brainstorming, acceptance-criteria structure), not as the actual workflow engine — don't let it redirect task creation/tracking into its own file structure.

## Постановка задач

При постановке/декомпозиции задач (PRD, эпики, GitHub issues, разбивка на подзадачи) — не просто фиксировать сказанное пользователем, а активно указывать на то, что могло быть упущено, **до** того как задача считается финальной:

- пропущенные шаги или зависимости в цепочке задач
- нелогичный порядок/последовательность (например задача зависит от другой, которая идёт позже или не заведена вовсе)
- отсутствующие acceptance criteria
- открытые вопросы, которые казались закрытыми, но на самом деле не были явно решены
- edge cases, не покрытые исходными материалами (ТЗ, макапы, предыдущие решения)

Это применимо к любой роли (`ba`, `frontend`, `backend`, `devops`, `qa`), а не только к постановщику задачи.

## Статусы задач и ответственные

Задачи ведутся на доске GitHub Projects (v2) **[steramer.io — Разработка](https://github.com/users/MACTEPwar/projects/3)**, к которой подключены все три репозитория (`steramer.io`, `streamer.API`, `stream.Front`) — issue из любого репо можно добавить на общую доску.

Каждая задача (GitHub issue) несёт:

- **роль-ответственный** — лейбл issue: `ba`/`frontend`/`backend`/`devops`/`qa` (заведены во всех трёх репозиториях), кто сейчас должен действовать. Автоматически видно на доске в поле Labels.
- **статус** — поле `Статус` на доске (single-select), значения: `Бэклог`, `К выполнению`, `В работе`, `Выполнена`, `Возвращена в работу`, `Проверена`.

При каждой смене статуса или ответственного агент оставляет **комментарий** в задаче: что было сделано/изменено и что требуется от следующего ответственного.

**Правило подтверждения перед стартом.** Агент никогда не начинает работу над задачей самостоятельно только потому, что увидел её в статусе "к выполнению" (или "возвращена в работу" — см. ниже) со своим тегом роли. Сначала он обязан спросить пользователя явно (например: "Появилась задача <...> в статусе «к выполнению» с тегом `frontend» — начать выполнение?") и приступать только после явного подтверждения ("да"/аналог). Это действует для любой роли, включая ту, в которой сейчас работает агент.

**Статус "в работе".** Как только пользователь подтвердил старт и агент реально приступает к задаче — статус сразу меняется на "в работе" (не остаётся в "к выполнению" на время выполнения).

**Статус "выполнена" — контрольная точка человека.** Когда исполнитель закончил свою часть, агент ставит статус "выполнена", оставляет комментарий с итогом и **на этом останавливается** — тег ответственного не переставляет и следующую роль не запускает сам. Хендофф — это решение пользователя: он смотрит, что сделано, и сам (или явно поручив агенту) переставляет тег на следующую роль и статус на "к выполнению" (пример: бэк закончил модуль аутентификации → статус "выполнена" → пользователь посмотрел и передал на `frontend` или `qa`, поставив "к выполнению"). Роль, увидевшая у себя такую задачу, обязана точно так же сначала спросить пользователя ("взять в работу?") и начинать только после подтверждения.

**Задачи без следующей роли в цепочке.** Если у задачи нет следующего исполнителя (например `devops`-only или `ba`-only задача, через которую не проходит `qa`) — пользователь, проверив результат на статусе "выполнена", ставит сразу "проверена" (сам выступает финальным ревьюером), минуя промежуточный хендофф.

**Кросс-репо зависимости.** В поле "Зависимости" внутри одного репозитория достаточно короткой ссылки (`#12`). Если задача зависит от issue в другом репозитории — писать полный путь `owner/repo#N` (например `MACTEPwar/streamer.API#3`), иначе GitHub не свяжет ссылку и она не будет кликабельной/трекаемой.

**Закрытие issue.** Статус "проверена" — финальный: вместе с его установкой issue закрывается (`gh issue close`). До этого момента issue остаётся открытым, даже на статусах "выполнена"/"к выполнению" у следующей роли.

**Формат описания задачи.** Тело issue пишется по единому шаблону: `## Описание`, `## Acceptance Criteria` (чек-лист), `## Зависимости`, `## Не входит` (что сознательно не входит в эту задачу, чтобы не размывать границы). Черновик показывается пользователю на рецензию до создания issue.

**Возврат в работу.** Если проверяющий (например QA) находит проблему и меняет статус на "возвращена в работу" с тегом роли, которая должна её исправить — эта роль обязана отреагировать так же, как на "к выполнению": заметить задачу, спросить у пользователя "начать работу над возвратом?" и не трогать её без подтверждения.

Это общая концепция — конкретные роли и цепочка передачи между ними варьируются от задачи к задаче; неизменен сам паттерн: тег ответственного + статус + комментарий с описанием изменений и ожиданий + подтверждение пользователя перед стартом любой работы.

## Git-ветки

**`steramer.io` (эта, умбрелла-репо)** — прямые коммиты в `master`, без веток/PR. Это доки/конвенции/submodule-указатели, не продакшн-код.

**`streamer.API` и `stream.Front` (код-репозитории)** — ветка на задачу + Pull Request:

- Ветка создаётся от актуального `master`, имя — `<type>/<issue>-<короткое-описание>` в стиле Conventional Commits (например `feat/1-nestjs-init`, `fix/12-cors-config`). `<type>` — тот же набор, что и в коммитах (см. ниже).
- Коммиты внутри ветки — по тем же правилам Conventional Commits и с тем же подтверждением текста пользователем, что и везде.
- Когда работа готова — исполняющая роль открывает Pull Request. Тело PR ссылается на issue через `Refs #N` (**не** `Closes #N` — автозакрытие GitHub намеренно не используется, см. "Закрытие issue" выше: issue закрывается только вместе со статусом "проверена", не автоматически по мержу PR).
- **Открытие PR = переход задачи в статус "выполнена"** — это и есть контрольная точка человека: ревью PR и решение смержить/вернуть на доработку.
- Мерж — squash merge, только после явного подтверждения пользователя (та же логика, что для коммитов/пушей — видимое, полу-необратимое изменение shared-состояния). Ветка удаляется после мержа (`gh pr merge --squash --delete-branch`).
- Мерж PR **не** значит, что задача закрыта — для цепочек с несколькими ролями (например бэк → фронт/QA) после мержа задача остаётся открытой и уходит в обычный хендофф (тег следующей роли + статус "к выполнению"). Issue закрывается только когда статус доходит до "проверена".

## Коммиты

Все коммиты в этом репозитории оформляются по Conventional Commits:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

`type` — один из:

- `feat` — новая фича (Features)
- `fix` — багфиксы (Bug Fixes)
- `perf` — оптимизация (Performance)
- `docs` — документация
- `style` — форматирование (не влияющее на поведение)
- `refactor` — переработка кода без изменения функционала
- `test` — только тесты
- `build` — сборка, конфигурация, зависимости
- `ci` — скрипты CI/CD
- `chore` — обслуживание, общее
- `revert` — откат коммитов

`description` (и `body`, если он есть) пишутся на русском языке.

Перед созданием коммита текст сообщения (`type`, `scope`, `description`, `body`) показывается пользователю и требует его подтверждения или правки — коммит не создаётся молча.
