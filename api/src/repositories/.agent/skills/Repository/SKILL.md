---
name: Repository
description: Repository layer best practices
---

## Role

Repositories are responsible for all data access within the application using Drizzle ORM.

## Rules

- **Use Drizzle ORM**: Interact with the database exclusively using Drizzle.
- **Data Access**: Perform create, read, update, and delete (CRUD) operations.
- **Transactions**: Handle transactions if necessary, or let the Service layer manage them.

## Prohibitions

- **No Business Logic**: Do not include business rules in the Repository. The Repository should only fetch or manipulate data.
- **No Controller Logic**: Do not handle HTTP request/response objects directly.
