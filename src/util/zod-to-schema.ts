import type { FastifySchema } from "fastify";
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export function zodSchemaToFastifySchema(
	zodSchema: z.ZodTypeAny,
): FastifySchema {
	return zodToJsonSchema(zodSchema) as FastifySchema;
}
