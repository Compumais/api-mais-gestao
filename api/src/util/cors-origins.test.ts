import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { corsOptions } from "./cors-origins.js";

describe("CORS do upload de imagens de produto", () => {
	let app: FastifyInstance;

	beforeEach(async () => {
		app = Fastify();
		await app.register(cors, corsOptions);
		app.post("/produtos/:id/imagens", async () => ({ ok: true }));
		await app.ready();
	});

	afterEach(async () => {
		await app.close();
	});

	it("autoriza o preflight da origem e dos headers usados pelo web", async () => {
		const response = await app.inject({
			method: "OPTIONS",
			url: "/produtos/00000000-0000-0000-0000-000000000000/imagens",
			headers: {
				origin: "https://maisgestao.compumais.com",
				"access-control-request-method": "POST",
				"access-control-request-headers":
					"authorization, content-type, x-file-name",
			},
		});

		expect(response.statusCode).toBe(204);
		expect(response.headers["access-control-allow-origin"]).toBe(
			"https://maisgestao.compumais.com",
		);
		expect(response.headers["access-control-allow-credentials"]).toBe("true");

		const allowedHeaders = String(
			response.headers["access-control-allow-headers"],
		)
			.toLowerCase()
			.split(",")
			.map((header) => header.trim());

		expect(allowedHeaders).toEqual(
			expect.arrayContaining(["authorization", "content-type", "x-file-name"]),
		);
	});

	it("não autoriza headers customizados fora da lista", async () => {
		const response = await app.inject({
			method: "OPTIONS",
			url: "/produtos/00000000-0000-0000-0000-000000000000/imagens",
			headers: {
				origin: "https://maisgestao.compumais.com",
				"access-control-request-method": "POST",
				"access-control-request-headers": "x-header-nao-autorizado",
			},
		});

		const allowedHeaders = String(
			response.headers["access-control-allow-headers"],
		).toLowerCase();

		expect(allowedHeaders).not.toContain("x-header-nao-autorizado");
	});
});
