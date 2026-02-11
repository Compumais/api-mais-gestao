---
name: hooks
description: Custom hooks best practices. Use this skill when building a new or modifying a hook. Generate a hook with a clear responsibility and with a clear props interface.
---

## Rules

- All hooks must start with `use`
- Hooks should encapsulate reusable logic
- Return only what is necessary (avoid overexposing)

## Prohibitions

- Don't use JSX in hooks
- Don't access DOM directly
