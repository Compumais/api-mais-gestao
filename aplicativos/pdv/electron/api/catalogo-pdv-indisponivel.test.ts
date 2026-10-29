import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError, isCatalogoPdvIndisponivel } from "./client";

describe("isCatalogoPdvIndisponivel", () => {
	it("trata 404 como endpoint ausente", () => {
		assert.equal(isCatalogoPdvIndisponivel(new ApiError("HTTP 404", 404)), true);
	});

	it("trata colisão Fastify /produtos/:id com catalogo-pdv", () => {
		const err = new ApiError(
			'Bad Request — params/id must match format "uuid" — FST_ERR_VALIDATION',
			400,
		);
		assert.equal(isCatalogoPdvIndisponivel(err), true);
	});

	it("não engole outros 400", () => {
		assert.equal(
			isCatalogoPdvIndisponivel(new ApiError("Erro de validação — page", 400)),
			false,
		);
	});

	it("ignora erros que não são ApiError", () => {
		assert.equal(isCatalogoPdvIndisponivel(new Error("Invalid uuid")), false);
	});
});
