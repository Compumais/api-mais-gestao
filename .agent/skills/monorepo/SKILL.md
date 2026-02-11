---
name: monorepo
description: Skill for monorepo project
---

## Rules

### 1. Always use relative paths
- Always use relative paths to refer to files within the monorepo.
- Never use absolute paths.
- Use `./` for current directory.
- Zero duplicate code.


## Architecture

/apps
 ├─ web/              # Next.js (frontend)
    ├─ src/
    ├─ public/
    ├─ package.json
    └─ tsconfig.json
 └─ api/              # API Node (separada ou edge)
    ├─ src/
    ├─ public/
    ├─ package.json
    └─ tsconfig.json