import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { linhasPagamentoCupom } from "./cupom-pagamentos";

describe("linhasPagamentoCupom", () => {
	it("um bloco por meio e NSU/autorização no cartão", () => {
		const linhas = linhasPagamentoCupom({
			meio_pagamento: "MISTO",
			pagamentos: [
				{ meio: "PIX", valor: 40 },
				{
					meio: "CARTAO",
					valor: 60,
					nsu: "9001",
					autorizacao: "AUTH7",
					bandeira: "VISA",
				},
				{ meio: "CARTAO", valor: 10, status: "cancelado" },
			],
		});
		assert.equal(linhas[0], "PAGAMENTOS");
		assert.match(linhas.join("\n"), /PIX/);
		assert.match(linhas.join("\n"), /NSU: 9001/);
		assert.match(linhas.join("\n"), /Autorizacao: AUTH7/);
		assert.match(linhas.join("\n"), /Bandeira: VISA/);
		assert.equal(
			linhas.some((l) => l.includes("10")),
			false,
		);
	});

	it("sem lançamentos usa o meio legado", () => {
		assert.deepEqual(linhasPagamentoCupom({ meio_pagamento: "DINHEIRO" }), [
			"Pagamento: DINHEIRO",
		]);
	});
});
