import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../api/client";
import { chaveIdempotenciaOutbox, prioridadeOutbox } from "../db/repos";
import { podeAplicarStatusNfce } from "./nfce-retaguarda";
import {
	atrasoBackoffOutboxMs,
	classificarErroOutbox,
	deveEmitirNfceNaBaixa,
	sincronizarItensAntesDaBaixa,
} from "./outbox";
import { cursorComSobreposicao, emLotesPorTamanho } from "./reconciliar-nfce";

describe("reconciliação robusta de NFC-e", () => {
	it("mantém a progressão monotônica dos status fiscais", () => {
		assert.equal(podeAplicarStatusNfce("autorizada", "pendente"), false);
		assert.equal(podeAplicarStatusNfce("autorizada", "erro"), false);
		assert.equal(podeAplicarStatusNfce("autorizada", "cancelada"), true);
		assert.equal(podeAplicarStatusNfce("cancelada", "autorizada"), false);
		assert.equal(podeAplicarStatusNfce("inutilizada", "pendente"), false);
		assert.equal(podeAplicarStatusNfce("erro_config", "autorizada"), true);
	});

	it("aplica backoff exponencial com teto de quinze minutos", () => {
		assert.equal(atrasoBackoffOutboxMs(0), 30_000);
		assert.equal(atrasoBackoffOutboxMs(1), 60_000);
		assert.equal(atrasoBackoffOutboxMs(2), 120_000);
		assert.equal(atrasoBackoffOutboxMs(20), 900_000);
	});

	it("classifica falhas permanentes e transitórias", () => {
		assert.equal(
			classificarErroOutbox(new ApiError("Fiscal inválido", 422)),
			"permanente",
		);
		assert.equal(
			classificarErroOutbox(new ApiError("Timeout", 408)),
			"transitorio",
		);
		assert.equal(
			classificarErroOutbox(new ApiError("Servidor", 503)),
			"transitorio",
		);
		assert.equal(
			classificarErroOutbox(new ApiError("Sessão expirada", 401)),
			"transitorio",
		);
	});

	it("gera chave estável para operação fiscal equivalente", () => {
		const payload = { idvenda: "venda-1", idnfce_local: "nota-1" };
		assert.equal(
			chaveIdempotenciaOutbox("transmitir_nfce_contingencia", payload),
			"transmitir_nfce_contingencia:venda-1",
		);
	});

	it("prioriza a criação da venda antes da contingência", () => {
		assert.ok(
			prioridadeOutbox("criar_venda") <
				prioridadeOutbox("transmitir_nfce_contingencia"),
		);
		assert.equal(prioridadeOutbox("outro_evento"), 100);
	});

	it("baixa venda com contingência local sem solicitar nova NFC-e", () => {
		assert.equal(
			deveEmitirNfceNaBaixa({
				emitirGlobal: true,
				statusNfceLocal: "contingencia",
				pagamentoDeveEmitir: true,
			}),
			false,
		);
		assert.equal(
			deveEmitirNfceNaBaixa({
				emitirGlobal: true,
				statusNfceLocal: "nao_emitida",
				pagamentoDeveEmitir: true,
			}),
			true,
		);
	});

	it("sincroniza todos os itens antes de baixar a venda", async () => {
		const operacoes: string[] = [];

		await sincronizarItensAntesDaBaixa(
			["item-1", "item-2"],
			async (item) => {
				operacoes.push(item);
			},
			async () => {
				operacoes.push("baixa");
			},
		);

		assert.deepEqual(operacoes, ["item-1", "item-2", "baixa"]);
	});

	it("sobrepõe o cursor para não perder transações concorrentes", () => {
		assert.equal(
			cursorComSobreposicao("2026-09-03T10:10:00.000Z|venda-1"),
			"2026-09-03T10:08:00.000Z|",
		);
	});

	it("divide lotes também pelo tamanho serializado", () => {
		const itens = [1, 2, 3].map((numero) => ({
			idvendalocal: `venda-${numero}`,
			statusLocal: "contingencia",
			xml: "x".repeat(20),
		}));
		assert.equal(emLotesPorTamanho(itens, 50, 70).length, 3);
	});
});
