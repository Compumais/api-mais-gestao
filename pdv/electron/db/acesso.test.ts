import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	normalizarPerfis,
	payloadSoTemChaves,
	planoTemGourmet,
	podeConfigurarPdv,
	sessaoTemGourmet,
} from "./acesso";

describe("podeConfigurarPdv", () => {
	it("libera admin, proprietario e super", () => {
		assert.equal(podeConfigurarPdv(["admin"]), true);
		assert.equal(podeConfigurarPdv(["proprietario"]), true);
		assert.equal(podeConfigurarPdv(["super"]), true);
		assert.equal(podeConfigurarPdv(["usuario", "admin"]), true);
	});

	it("bloqueia operador comum", () => {
		assert.equal(podeConfigurarPdv(["usuario"]), false);
		assert.equal(podeConfigurarPdv(["garcom"]), false);
		assert.equal(podeConfigurarPdv(["financeiro"]), false);
		assert.equal(podeConfigurarPdv([]), false);
		assert.equal(podeConfigurarPdv(null), false);
	});

	it("lê JSON gravado na sessão", () => {
		assert.equal(podeConfigurarPdv('["proprietario"]'), true);
		assert.equal(podeConfigurarPdv('["usuario"]'), false);
	});
});

describe("planoTemGourmet", () => {
	it("libera só com módulo gourmet", () => {
		assert.equal(planoTemGourmet(["gourmet"]), true);
		assert.equal(planoTemGourmet(["nfse", "gourmet"]), true);
		assert.equal(planoTemGourmet(["nfse"]), false);
		assert.equal(planoTemGourmet([]), false);
		assert.equal(planoTemGourmet('["gourmet"]'), true);
	});
});

describe("sessaoTemGourmet", () => {
	it("interpreta flag gravada na sessão", () => {
		assert.equal(sessaoTemGourmet("1"), true);
		assert.equal(sessaoTemGourmet("0"), false);
		assert.equal(sessaoTemGourmet(null), false);
	});
});

describe("normalizarPerfis", () => {
	it("aceita array, string e JSON", () => {
		assert.deepEqual(normalizarPerfis(["Admin"]), ["admin"]);
		assert.deepEqual(normalizarPerfis("proprietario"), ["proprietario"]);
		assert.deepEqual(normalizarPerfis('["garcom"]'), ["garcom"]);
	});
});

describe("payloadSoTemChaves", () => {
	it("aceita só as chaves permitidas", () => {
		assert.equal(
			payloadSoTemChaves({ filtro_apenas_abertas: "1" }, [
				"filtro_apenas_abertas",
			]),
			true,
		);
		assert.equal(
			payloadSoTemChaves({ api_url: "x", numeropdv: "1" }, ["api_url"]),
			false,
		);
		assert.equal(
			payloadSoTemChaves(
				{
					pdv_modo: "secundario",
					pdv_principal_host: "192.168.1.10",
					pdv_principal_porta: "5050",
					numeropdv: "2",
				},
				[
					"api_url",
					"database_url",
					"pdv_modo",
					"pdv_principal_host",
					"pdv_principal_porta",
					"numeropdv",
				],
			),
			true,
		);
	});
});
