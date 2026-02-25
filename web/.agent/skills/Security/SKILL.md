---
name: security
description: Security best practices for web development. Use this skill when building a new or modify any file that handle sensitive data, user input or external API response. Never use this skill alone, always use it with other skills.
---

## Rules

- Never store secrets in code
- Never trust data coming from the client
- Always validate and sanitize user input
- Use environment variables for sensitive data
- Use HTTPS in production


## Authentication

- Authentication must be centralized (better-auth)
- Do not duplicate session logic
- Protect private router via layout or middleware

## Fetch and API

- Validate API response with Zod when applicable
- Handle errors explicitly
- Never use `dangerouslySetInnerHTML`
- Never use `eval`
- Never interpolate HTML from users
- Never store sensitive data in `localStorage`
- Never silence security errors

## Examples

```typescript
// Good: Sensitive data comes from environment variables
export const config = {
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
}

// Bad: Sensitive data is hardcoded
export const config = {
  databaseUrl: "postgres://user:password@localhost:5432/db",
  jwtSecret: "secret",
}

// Good: Client data is always validated on the server
import { z } from "zod"

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function createUser(input: unknown) {
  const data = createUserSchema.parse(input)

  // Safe to use
  return db.user.create({ data })
}

// Bad: Trusting client input directly
export async function createUser(input: any) {
  return db.user.create({ data: input as any })
}

// Good: Validate external API responses
import { z } from "zod"

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export async function fetchUsers() {
  const res = await fetch("https://api.example.com/users")

  if (!res.ok) {
    throw new Error("Failed to fetch users")
  }

  const data = await reson()
  return UserSchema.array().parse(data)
}

// Bad: Blindly trusting API response
export async function fetchUsers() {
  const res = await fetch("https://api.example.com/users")
  return reson()
}

// Good: User content rendered safely
export function Comment({ text }: { text: string }) {
  return <p>{text}</p>
}

// Bad: Rendering user content unsafely
export function Comment({ text }: { text: string }) {
  return <p dangerouslySetInnerHTML={{ __html: text }} />
}
```
