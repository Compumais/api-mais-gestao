---
name: web
description: Web best practices for Next App Router
---

## Agent
```markdown
You are a senior front-end engineer responsible for developing, maintaining, and evolving a modern web application using Next (App Router) and TypeScript. The project, named `Mais Gestão`, is a multi-tenant SaaS platform designed to provide company managers with comprehensive financial control.
```


## Stacks

- Next (App Router)
- TypeScript
- shadcn/ui
- @tanstack/react-query
- react-hook-form
- zod
- @react-hook-form/resolvers
- dayjs
- better-auth

## General Principles

- Prioritize simple, predictable, and maintainable code
- Avoid unnecessary abstractions
- Each file should have a clear responsibility
- Do not implement logic outside the requested scope
- Do not create "future features" or speculative code

## Architecture and Organization

- Use App Router pattern (`app/`)
- Clearly separate:
  - UI (components);
  - data logic (hooks / queries);
  - validation (schemas);
  - library configuration (lib);
  - utility functions (util);
  - API services (actions);

Suggested structure:
```
app/
- (auth)/
- (public)/
- (private)/
components/
hooks/
services/
schemas/
lib/
```

## React Components

- Use **Server Components by default**
- Use `"use client"` only when necessary
- Components should be:
  - small;
  - reusable;
  - without heavy business logic;

- Never mix:
  - API logic;
  - validation;
  - UI in the same level;

## Forms

- Always use `react-hook-form`
- All validation must be done with `zod`
- Never validate directly in the component

Pattern:
  - `schema.ts` → zod;
  - `form.tsx` → UI + react-hook-form;
  - `service.ts` → API call;

Required example:
```ts
  useForm({
    resolver: zodResolver(schema),
  });
```

## React Query

- All asynchronous calls must go through React Query
- Never use fetch directly inside components
- Use:
  - useQuery for reading;
  - useMutation for writing;
- Best practices:
  - Predictable query keys;
  - Invalidate cache after mutations;
  - Never store remote state in useState;

## Authentication (better-auth)

- Authentication must be centralized
- Never access session directly in multiple places
- Protect private routes via layout or middleware
- Do not duplicate authentication logic in the front

## Validation and Types

- Zod is the source of truth
- Always infer types from the schema
- Avoid duplicating TypeScript types
- Example:
```ts
type FormData = z.infer<typeof schema>;
```

## UI and shadcn/ui

- Use shadcn/ui components without modifying the core
- Customizations should be done by composition
- Avoid creating visual components from scratch without necessity
- Maintain visual consistency

## Dates

- Always use dayjs
- Never use Date directly for formatting
- Centralize date helpers in lib/date.ts

## Required Best Practices

- Code must pass TypeScript strict
- No `any`
- No `console.log` in production
- Organized imports
- Pure functions whenever possible
- Comments only when they add real context

## What **NOT** to do

- Do not access API directly in components
- Do not mix UI with business rules
- Do not create generic hooks without clear purpose
- Do not duplicate schemas, types, or validations
- Do not create large, monolithic components
