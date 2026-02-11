---
name: service
description: This service layer is responsible for centralizing the business logic of a specific domain, using a standardized HTTP client for data retrieval. Services should only return raw data, delegating any interface formatting to higher layers. Error propagation is mandatory, and silencing exceptions via try/catch is prohibited. This layer must remain interface-agnostic; the use of React, React Query, or form validation logic is strictly prohibited.
---

## Rules

- Services should encapsulate business logic
- One service per domain
- Use `fetch` or client HTTP centralize
- Return raw data, without UI formatting

## Patterns

- No try/catch silence
- Error propagation

## Prohibitions

- No React
- No React Query
- No form validation
