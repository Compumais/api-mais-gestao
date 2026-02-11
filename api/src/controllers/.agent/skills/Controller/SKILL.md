---
name: controller
description: Create controller best practices. Use this skill when building a new or modifying a controller/route. Never create a controller with calling database directly.
---

## Role

Controllers should only handle the incoming HTTP request and return the appropriate HTTP response.

## Rules

- **Receive Request**: Validate input using Zodschemas.
- **Process**: Call the appropriate Service method.
- **Return Response**: Send the result back to the client with the correct HTTP status code.

## Prohibitions

- **No Business Logic**: Do not implement business rules directly in the controller.
- **No Direct Database Access**: Do not query the database directly. Use Services to interact with data.
- **No Heavy Computation**: Offload complex tasks to Services.
