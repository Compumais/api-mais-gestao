import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mesaTemContaAberta } from "./estado-mesa";

describe("persistência da abertura de mesa/comanda", () => {
	it("mantém ocupada uma conta recém-aberta mesmo sem itens", () => {
		assert.equal(
			mesaTemContaAberta({
				statusMesa: "ocupada",
				idconta: "conta-vazia",
				abertoem: "2026-09-19T12:00:00.000Z",
			}),
			true,
		);
	});

	it("não considera ocupada uma referência incompleta", () => {
		assert.equal(
			mesaTemContaAberta({
				statusMesa: "ocupada",
				idconta: null,
				abertoem: null,
			}),
			false,
		);
	});
});
