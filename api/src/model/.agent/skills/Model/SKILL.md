---
name: Model
description: Database Model best practices
---

## Rules

- **Type Inference**: Use Drizzle schema inference for types.
- **Example**:
  ```typescript
  export type Usuario = typeof schema.usuarios.$inferSelect;
  ```
