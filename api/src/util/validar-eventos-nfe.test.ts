import { describe, expect, it } from "vitest";
import { NFE_STATUS } from "@/util/nfe-status.js";
import {
	inutilizacaoJaEncerradaNaSefaz,
	notaEstaDentroPrazoCancelamentoNfe,
	resolverStatusCancelamentoNfe,
	validarCancelamentoNfe,
	validarInutilizacaoNfe,
	validarJustificativaNfe,
} from "@/util/validar-eventos-nfe.js";

describe("validar-eventos-nfe", () => {
	it("exige justificativa com no mínimo 15 caracteres", () => {
		expect(validarJustificativaNfe("curta")).toMatch(/15 caracteres/);
		expect(validarJustificativaNfe("Justificativa válida")).toBeNull();
	});

	it("permite cancelamento de NF-e autorizada dentro de 24h", () => {
		const agora = new Date("2026-06-23T12:00:00.000Z");
		const nota = {
			tipoorigem: 1,
			status: NFE_STATUS.AUTORIZADA,
			chavenfe: "3".repeat(44),
			protocolonfe: "135150001686732",
			datahoraemissao: "2026-06-23T10:00:00.000Z",
		};

		expect(
			validarCancelamentoNfe(
				nota,
				"Erro de digitação nos dados do destinatário",
				agora,
			).ok,
		).toBe(true);
	});

	it("bloqueia cancelamento após 24h da autorização", () => {
		const agora = new Date("2026-06-24T11:00:00.000Z");
		const nota = {
			tipoorigem: 1,
			status: NFE_STATUS.AUTORIZADA,
			chavenfe: "3".repeat(44),
			protocolonfe: "135150001686732",
			datahoraemissao: "2026-06-23T10:00:00.000Z",
		};

		const resultado = validarCancelamentoNfe(
			nota,
			"Erro de digitação nos dados do destinatário",
			agora,
		);
		expect(resultado.ok).toBe(false);
		if (!resultado.ok) {
			expect(resultado.mensagem).toMatch(/24 horas/);
		}
	});

	it("permite inutilização de NF-e rejeitada", () => {
		const resultado = validarInutilizacaoNfe(
			{
				tipoorigem: 1,
				status: NFE_STATUS.REJEITADA,
				serie: "1",
				numeronotafiscal: "123",
			},
			"Numeração não será utilizada por erro de cadastro",
		);

		expect(resultado.ok).toBe(true);
	});

	it("permite inutilização de NFC-e rejeitada mesmo com protocolo de lote", () => {
		const resultado = validarInutilizacaoNfe(
			{
				tipoorigem: 1,
				status: NFE_STATUS.REJEITADA,
				serie: "3",
				numeronotafiscal: "128",
				protocolonfe: "123456",
			},
			"NFC-e rejeitada, numeração não será utilizada",
		);

		expect(resultado.ok).toBe(true);
	});

	it("calcula prazo de cancelamento pela data de autorização", () => {
		expect(
			notaEstaDentroPrazoCancelamentoNfe({
				datahoraemissao: "2026-06-23T10:00:00.000Z",
			}, new Date("2026-06-23T20:00:00.000Z")),
		).toBe(true);
	});

	it("reconhece inutilização já encerrada na SEFAZ", () => {
		expect(inutilizacaoJaEncerradaNaSefaz("563")).toBe(true);
		expect(inutilizacaoJaEncerradaNaSefaz("241")).toBe(true);
		expect(
			inutilizacaoJaEncerradaNaSefaz(
				undefined,
				"Rejeição: Um número da faixa já foi utilizado",
			),
		).toBe(true);
		expect(inutilizacaoJaEncerradaNaSefaz("215", "Rejeição genérica")).toBe(
			false,
		);
	});

	it("mapeia cStat 135/101 como cancelada no prazo e 155 como fora do prazo", () => {
		expect(resolverStatusCancelamentoNfe("135")).toBe(NFE_STATUS.CANCELADA);
		expect(resolverStatusCancelamentoNfe("101")).toBe(NFE_STATUS.CANCELADA);
		expect(resolverStatusCancelamentoNfe("155")).toBe(
			NFE_STATUS.CANCELADA_FORA_PRAZO,
		);
		expect(resolverStatusCancelamentoNfe(null)).toBe(NFE_STATUS.CANCELADA);
	});
});
