---
name: Service
description: Service layer best practices
---

## Role

Services are responsible for the business logic of the application. They process data received from Controllers and interact with Repositories.

## Rules

- **Concentrate Business Logic**: All business rules should reside in the Service layer.
- **Use Transactions**: Use database transactions when performing multiple related operations.
- **Use Repositories**: Access data only through the Repository layer.

## Prohibitions

- **No Controller Logic**: Do not handle HTTP request/response objects directly.
- **No Direct Database Access**: Do not query the database directly (unless via Repositories).
