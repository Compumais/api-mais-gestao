import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError, isNaoAutorizado } from "../api/client";
import { classificarErroOutbox } from "./outbox";

describe("sessão expirada no sync", () => {
	it("trata 401 como erro transitório (fila não é cancelada)", () => {
		assert.equal(
			classificarErroOutbox(new ApiError("Sessão expirada", 401)),
			"transitorio",
		);
	});

	it("detecta não autorizado apenas em 401", () => {
		assert.equal(isNaoAutorizado(new ApiError("Não autorizado", 401)), true);
		assert.equal(isNaoAutorizado(new ApiError("Proibido", 403)), false);
		assert.equal(isNaoAutorizado(new Error("falha")), false);
	});
});
