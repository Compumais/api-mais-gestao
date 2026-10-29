import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	empresaPosConfere,
	operadorCompativelComEmpresa,
	resolverGarcomPos,
	sessaoPdvProntaParaPos,
} from "./sessao-pos";

describe("sessão do POS isolada do caixa", () => {
	it("exige operador e empresa já abertos no PDV", () => {
		assert.equal(
			sessaoPdvProntaParaPos({ token: "t", idempresa: "emp-1" }),
			true,
		);
		assert.equal(
			sessaoPdvProntaParaPos({ token: null, idempresa: "emp-1" }),
			false,
		);
		assert.equal(
			sessaoPdvProntaParaPos({ token: "t", idempresa: null }),
			false,
		);
	});

	it("com API key do terminal, não exige operador logado no caixa", () => {
		assert.equal(
			sessaoPdvProntaParaPos({ token: null, idempresa: "emp-1" }, true),
			true,
		);
		assert.equal(
			sessaoPdvProntaParaPos({ token: null, idempresa: null }, true),
			false,
		);
	});

	it("recusa operador de outra empresa e aceita lista indefinida", () => {
		assert.equal(
			operadorCompativelComEmpresa([{ id: "emp-2" }], "emp-1"),
			false,
		);
		assert.equal(
			operadorCompativelComEmpresa([{ id: "emp-1" }, { id: "emp-2" }], "emp-1"),
			true,
		);
		assert.equal(operadorCompativelComEmpresa([], "emp-1"), true);
	});

	it("imprime o garçom informado no pedido e, sem ele, o do terminal", () => {
		assert.equal(resolverGarcomPos("  Ana  ", "Caixa"), "Ana");
		assert.equal(resolverGarcomPos("", "  Bruno "), "Bruno");
		assert.equal(resolverGarcomPos(null, null), null);
		assert.equal(resolverGarcomPos("x".repeat(100), null)?.length, 80);
	});

	it("não troca a empresa do caixa quando o POS escolhe outra", () => {
		assert.equal(empresaPosConfere("emp-1", "emp-1"), "ok");
		assert.equal(empresaPosConfere("", "emp-1"), "ok");
		assert.equal(empresaPosConfere("emp-2", "emp-1"), "empresa_diferente");
		assert.equal(empresaPosConfere("emp-1", null), "pdv_sem_empresa");
	});
});
