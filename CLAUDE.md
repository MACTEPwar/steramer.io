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

- `ccpm` (community, [automazeio/ccpm](https://github.com/automazeio/ccpm), synced manually — not auto-updating) — spec-driven project management: PRD → Epic → GitHub Issues → parallel agents → shipped code. Use for writing PRDs, decomposing epics into tasks, syncing to GitHub Issues, starting work on an issue, standups, and status checks.

## Постановка задач

При постановке/декомпозиции задач (PRD, эпики, GitHub issues, разбивка на подзадачи) — не просто фиксировать сказанное пользователем, а активно указывать на то, что могло быть упущено, **до** того как задача считается финальной:

- пропущенные шаги или зависимости в цепочке задач
- нелогичный порядок/последовательность (например задача зависит от другой, которая идёт позже или не заведена вовсе)
- отсутствующие acceptance criteria
- открытые вопросы, которые казались закрытыми, но на самом деле не были явно решены
- edge cases, не покрытые исходными материалами (ТЗ, макапы, предыдущие решения)

Это применимо к любой роли (`ba`, `frontend`, `backend`, `devops`, `qa`), а не только к постановщику задачи.

## Статусы задач и ответственные

Каждая задача (GitHub issue) несёт два тега: **роль-ответственный** (`frontend`/`backend`/`devops`/`qa`/`ba` — кто сейчас должен действовать) и **статус**:

- `backlog` — бэклог, ещё не готова к работе
- `к выполнению` — готова, ждёт начала
- `в работе` — кто-то сейчас её делает
- `выполнена` — сделана исполнителем
- `возвращена в работу` — не прошла проверку, отправлена на доработку
- `проверена` — прошла проверку, закрыта

При каждой смене статуса или ответственного агент оставляет **комментарий** в задаче: что было сделано/изменено и что требуется от следующего ответственного.

**Правило подтверждения перед стартом.** Агент никогда не начинает работу над задачей самостоятельно только потому, что увидел её в статусе "к выполнению" со своим тегом роли. Сначала он обязан спросить пользователя явно (например: "Появилась задача <...> в статусе «к выполнению» с тегом `frontend» — начать выполнение?") и приступать только после явного подтверждения ("да"/аналог). Это действует для любой роли, включая ту, в которой сейчас работает агент.

**Хендофф по завершении.** Закончив работу над задачей, агент переставляет тег ответственного на следующую роль в цепочке и статус — на "к выполнению" (пример: закончил модуль аутентификации → ответственный `qa`, статус "к выполнению"). Роль, увидевшая у себя такую задачу, обязана точно так же сначала спросить пользователя ("взять в работу?") и начинать только после подтверждения.

Это общая концепция — конкретные роли и цепочка передачи между ними варьируются от задачи к задаче; неизменен сам паттерн: тег ответственного + статус + комментарий с описанием изменений и ожиданий + подтверждение пользователя перед стартом любой работы.

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
