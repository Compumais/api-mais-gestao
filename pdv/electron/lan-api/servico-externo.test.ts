import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { respostaEhDoPdv, valorArgumento } from "./servico-externo";

describe("convivência com o PDV rodando como serviço", () => {
	it("reconhece a resposta de /pos/health do PDV", () => {
		assert.equal(
			respostaEhDoPdv({ ok: true, app: "pdv-mais-gestao", version: "0.1.43" }),
			true,
		);
		assert.equal(respostaEhDoPdv({ ok: true, app: "outro" }), false);
		assert.equal(respostaEhDoPdv({ ok: false, app: "pdv-mais-gestao" }), false);
		assert.equal(respostaEhDoPdv(null), false);
		assert.equal(respostaEhDoPdv("ok"), false);
	});

	it("lê argumentos --nome=valor da linha de comando", () => {
		const argv = [
			"PDV.exe",
			"--lan-service",
			'--pdv-user-data="C:\\Users\\Caixa\\AppData\\Roaming\\pdv-mais-gestao"',
		];
		assert.equal(
			valorArgumento(argv, "pdv-user-data"),
			"C:\\Users\\Caixa\\AppData\\Roaming\\pdv-mais-gestao",
		);
		assert.equal(valorArgumento(argv, "inexistente"), null);
		assert.equal(valorArgumento(["--pdv-user-data="], "pdv-user-data"), null);
	});
});
