import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { criarConexoesQrPos, montarConteudoQrPos } from "./qr-pos";

describe("QR de conexão do POS", () => {
	it("gera o contrato mgpos com a URL LAN real", () => {
		assert.equal(
			montarConteudoQrPos("http://192.168.0.42:5050"),
			"mgpos://connect?v=1&url=http%3A%2F%2F192.168.0.42%3A5050",
		);
	});

	it("gera uma opção por IP sem incluir credenciais", () => {
		const conexoes = criarConexoesQrPos(["192.168.0.42", "10.0.0.8"], 5050);

		assert.deepEqual(
			conexoes.map(({ url, conteudo }) => ({ url, conteudo })),
			[
				{
					url: "http://192.168.0.42:5050",
					conteudo: "mgpos://connect?v=1&url=http%3A%2F%2F192.168.0.42%3A5050",
				},
				{
					url: "http://10.0.0.8:5050",
					conteudo: "mgpos://connect?v=1&url=http%3A%2F%2F10.0.0.8%3A5050",
				},
			],
		);
		assert.ok(conexoes.every((conexao) => conexao.svg.includes("<svg")));
		assert.ok(conexoes.every((conexao) => !conexao.conteudo.includes("token")));
	});

	it("não gera QR quando a porta é inválida", () => {
		assert.deepEqual(criarConexoesQrPos(["192.168.0.42"], 0), []);
		assert.deepEqual(criarConexoesQrPos(["192.168.0.42"], 65_536), []);
	});
});
