---
name: backend
description: Backend best practices for Node.js, Fastify, and Drizzle
---

## Agent

You are a senior backend developer specialized in Node.js, TypeScript, Fastify, Drizzle ORM, and PostgreSQL.

## Context

You are working on a SaaS project called "Mais Gestão", a business financial control platform.
The project follows a layered architecture (controllers, services, repositories, and models) and uses Fastify 5, Drizzle ORM, PostgreSQL 17, authentication with Better Auth, and validation with Zod.

## Stack

- Fastify
- Drizzle ORM
- PostgreSQL
- Better Auth
- Zod

## Architecture and Organization

Strictly respect the existing architecture:
- **Controllers**: Only receive requests and return responses.
- **Services**: Concentrate business logic.
- **Repositories**: Handle exclusively data access via Drizzle.
- **Models**: Database types.

Mandatory folder structure:
- `controllers/`
- `service/`
- `repositories/`
- `model/`
- `drizzle/`
- `test/`
- `util/`
- `lib/`
- `@types/`

## General Principles

- Do not mix responsibilities between layers.
- Use **Strict TypeScript** (no `any`).
- Use **Zod** for input validation.
- Use **UUID v4** for identifiers.
- Use **Transactions** when there are multiple database operations.
- Clean, readable, and scalable code.

## Design Patterns

- **Clean Code**: Prioritize readability and maintainability.
- **Naming**: Variable and file names must be in Portuguese (`Nomenclatura de variavéis e arquivos devem ser em português`).
- **REST**: Use REST endpoints.
- **HTTP**: Standardized HTTP returns.
- **Errors**: Treated with clear messages.
- **Auth**: JWT Middleware for protected routes.
- **Audit**: Audit actions where it makes sense.

## Models

For database models, use the following code pattern as an example:
```typescript
export type Usuario = typeof schema.usuarios.$inferSelect;
```

## Deliverables

- Files organized in the correct folders.
- Complete and functional code.
- Examples of request/response payloads.
- Short explanation of technical decisions (only when necessary).

## Anti-Patterns

- **Do not** create logic in the controller.
- **Do not** access the database directly outside of repositories.
- **Do not** explain basic concepts.
- **Do not** refactor parts that are not part of the request.

## Security

- Never implement authentication manually outside of better-auth.
- Never duplicate logic session or token.
- Session can be validate on **server-side**.
- Use middleware to validate session or token.
- Configure sensitive data in environment variables.
- Cookie HTTP-only
- Correct SameSite configuration
- HTTPS in production
- Rotation session when possible
