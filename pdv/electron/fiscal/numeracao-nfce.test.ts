import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	classificarConflitosNumeracao,
	resolverProximoNumeroMonotonico,
	type NfceNumeracaoResumo,
} from "./numeracao-nfce";

describe("resolverProximoNumeroMonotonico", () => {
	it("não rebobina abaixo do maior nNF local", () => {
		assert.equal(
			resolverProximoNumeroMonotonico({
				remoto: 22832,
				localAtual: 22833,
				maxNumeroUsadoLocal: 22832,
			}),
			22833,
		);
	});

	it("avança além do remoto quando há uso local maior", () => {
		assert.equal(
			resolverProximoNumeroMonotonico({
				remoto: 100,
				localAtual: 50,
				maxNumeroUsadoLocal: 22832,
			}),
			22833,
		);
	});

	it("usa o remoto quando é o maior", () => {
		assert.equal(
			resolverProximoNumeroMonotonico({
				remoto: 500,
				localAtual: 100,
				maxNumeroUsadoLocal: 200,
			}),
			500,
		);
	});

	it("fallback 1 quando valores inválidos", () => {
		assert.equal(
			resolverProximoNumeroMonotonico({
				remoto: 0,
				localAtual: Number.NaN,
				maxNumeroUsadoLocal: null,
			}),
			1,
		);
	});
});

describe("classificarConflitosNumeracao", () => {
	const base = (parcial: Partial<NfceNumeracaoResumo>): NfceNumeracaoResumo => ({
		id: parcial.id ?? "a",
		idvenda: parcial.idvenda ?? "v",
		serie: parcial.serie ?? 1,
		numero: parcial.numero ?? 1,
		chave: parcial.chave ?? null,
		status: parcial.status ?? "contingencia",
		tpemis: parcial.tpemis ?? 9,
		criadoem: parcial.criadoem ?? "2026-09-01T00:00:00.000Z",
	});

	it("marca contingência órfã quando existe autorizada no mesmo nNF", () => {
		const conflitos = classificarConflitosNumeracao([
			base({
				id: "orfao",
				idvenda: "v1",
				numero: 22832,
				status: "contingencia",
				chave: "chave-a",
				criadoem: "2026-09-06T00:00:00.000Z",
			}),
			base({
				id: "ok",
				idvenda: "v2",
				numero: 22832,
				status: "autorizada",
				chave: "chave-b",
				tpemis: 1,
				criadoem: "2026-09-03T00:00:00.000Z",
			}),
		]);
		assert.equal(conflitos.length, 1);
		assert.deepEqual(conflitos[0].idsOrfaos, ["orfao"]);
	});

	it("ignora grupos com uma única NFC-e", () => {
		assert.equal(
			classificarConflitosNumeracao([
				base({ id: "unica", numero: 10, status: "autorizada" }),
			]).length,
			0,
		);
	});
});
