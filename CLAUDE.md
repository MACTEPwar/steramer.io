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
