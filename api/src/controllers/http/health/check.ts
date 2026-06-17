import { sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "@/repositories/connection.js";

const startedAt = Date.now();

async function pingDatabase(): Promise<{
	status: "ok" | "error";
	latencyMs?: number;
	error?: string;
}> {
	const start = Date.now();
	try {
		await db.execute(sql`SELECT 1`);
		return { status: "ok", latencyMs: Date.now() - start };
	} catch (error) {
		return {
			status: "error",
			error: error instanceof Error ? error.message : "Falha ao conectar no banco",
		};
	}
}

export async function healthCheck(
	_request: FastifyRequest,
	reply: FastifyReply,
) {
	const database = await pingDatabase();
	const healthy = database.status === "ok";

	reply.status(healthy ? 200 : 503).send({
		status: healthy ? "ok" : "degraded",
		service: "api-mais-gestao",
		timestamp: new Date().toISOString(),
		uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
		database,
	});
}
