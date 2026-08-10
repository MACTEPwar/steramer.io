# Specification Quality Checklist: Новостная подсистема

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-11
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

Маркеров `[NEEDS CLARIFICATION]` в спеке нет: все шесть неоднозначностей были сняты в диалоге с пользователем до написания документа. Зафиксированные решения:

1. **Фильтрация архива** — переносится на сервер целиком (диапазон дат + несколько тем + признаки «просмотрено/лайкнуто»). Текущее поведение — дефект.
2. **Просмотры** — учитываются только у авторизованных; занижение счётчика принято сознательно.
3. **Точка фокуса при редактировании** — сохраняется, если картинка с тем же адресом осталась в наборе.
4. **Содержимое закреплённых новостей** — приходит вместе с раскладкой витрины, чтобы снять зависимость от лимита выборки.
5. **Флаг «без фото»** — удаляется; отсутствие картинок и так валидное состояние.
6. **Лайк гостя** — только подсказка, без открытия окна входа.
7. **Файлы-сироты** — подлежат удалению с проверкой, что адрес больше нигде не используется.
8. **Роль модератора** — остаётся зарезервированной, прав не даёт.
9. **Дублирование закреплённой новости в общем списке** — намеренное поведение.

Шесть требований описывают поведение, отличное от текущего кода (Д1–Д6 во входных данных): FR-007, FR-009, FR-012, FR-033, FR-037, FR-043. Из них должны появиться задачи на доске; FR-049 фиксирует Д6 как принятое ограничение, а не как работу.

Спека готова к `/speckit-plan`. Прогон `/speckit-clarify` не требуется — неоднозначности сняты заранее.
