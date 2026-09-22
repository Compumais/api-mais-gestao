import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../api/client";
import { validarConfirmacaoVenda } from "./outbox";

describe("confirmação da venda PDV", () => {
	it("aceita somente o mesmo id local acompanhado de id remoto", () => {
		assert.equal(
			validarConfirmacaoVenda(
				{
					idvendalocal: "local-1",
					idremoto: "remoto-1",
				},
				"local-1",
			),
			"remoto-1",
		);
	});

	it("recusa resposta sem identidade local ou divergente", () => {
		assert.throws(
			() => validarConfirmacaoVenda({ id: "remoto-1" }, "local-1"),
			(err) =>
				err instanceof ApiError && err.code === "VENDA_PDV_NAO_CONFIRMADA",
		);
		assert.throws(() =>
			validarConfirmacaoVenda(
				{ idvendalocal: "local-2", idremoto: "remoto-1" },
				"local-1",
			),
		);
	});
});
