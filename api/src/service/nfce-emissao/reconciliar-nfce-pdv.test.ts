import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as reconciliacaoRepository from "@/repositories/reconciliacao-nfce-pdv-repositories.js";
import * as terminalRepository from "@/repositories/terminal-pdv-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import * as reconciliarAutorizadaService from "./reconciliar-nfce-autorizada-sefaz.js";
import {
	reconciliarNfcePdvService,
	statusCanonicoNfce,
} from "./reconciliar-nfce-pdv.js";
import * as contingenciaService from "./transmitir-nfce-contingencia.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/reconciliacao-nfce-pdv-repositories.js");
vi.mock("@/repositories/terminal-pdv-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("./reconciliar-nfce-autorizada-sefaz.js");
vi.mock("./transmitir-nfce-contingencia.js");

const parametrosBase = {
	idusuario: "usuario-1",
	idempresa: "empresa-1",
	numeropdv: 2,
	cicloId: "ciclo-1",
	limite: 50,
	notas: [
		{
			idvendalocal: "venda-local-1",
			statusLocal: "pendente" as const,
		},
	],
};

const chaveNfce = "1".repeat(44);
const vendaBase = {
	id: "venda-remota-1",
	idempresa: parametrosBase.idempresa,
	numeropdv: parametrosBase.numeropdv,
	vendalocal: 3,
	idvendalocal: "venda-local-1",
	idnotafiscalnfce: "nfce-1",
};
const notaBase = {
	id: "nfce-1",
	idempresa: parametrosBase.idempresa,
	modelo: "65",
	status: NFE_STATUS.PENDENTE,
	chavenfe: chaveNfce,
	serie: "1",
	numeronotafiscal: "10",
	protocolonfe: null,
	dataalteracao: "2026-09-03T10:00:00.000Z",
	datainclusao: null,
	datahoraemissao: null,
};

describe("reconciliarNfcePdvService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			terminalRepository.buscarTerminalPdvAtivoPorNumero,
		).mockResolvedValue({ id: "terminal-1" } as never);
		vi.mocked(
			reconciliacaoRepository.executarComLockReconciliacaoNfce,
		).mockImplementation(async (_idempresa, _numeropdv, executar) => ({
			adquirido: true,
			resultado: await executar(),
		}));
		vi.mocked(reconciliacaoRepository.listarDeltaNfcePdv).mockResolvedValue([]);
	});

	it("rejeita terminal PDV ausente ou inativo antes de adquirir o lock", async () => {
		vi.mocked(
			terminalRepository.buscarTerminalPdvAtivoPorNumero,
		).mockResolvedValue(undefined);

		const resultado = await reconciliarNfcePdvService(parametrosBase);

		expect(resultado).toMatchObject({
			success: false,
			status: 400,
			codigoErro: "TERMINAL_PDV_AUSENTE",
		});
		expect(
			reconciliacaoRepository.executarComLockReconciliacaoNfce,
		).not.toHaveBeenCalled();
	});

	it("retorna 409 quando outro ciclo possui o lock do PDV", async () => {
		vi.mocked(
			reconciliacaoRepository.executarComLockReconciliacaoNfce,
		).mockResolvedValue({ adquirido: false });

		const resultado = await reconciliarNfcePdvService(parametrosBase);

		expect(resultado).toMatchObject({
			success: false,
			status: 409,
			code: "SYNC_NFCE_EM_ANDAMENTO",
		});
	});

	it("mantém item aguardando até a venda chegar pela outbox", async () => {
		vi.mocked(
			reconciliacaoRepository.buscarVendaParaReconciliacaoNfce,
		).mockResolvedValue(undefined);

		const resultado = await reconciliarNfcePdvService(parametrosBase);

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.itens).toEqual([
			expect.objectContaining({
				idvendalocal: "venda-local-1",
				existeRetaguarda: false,
				acao: "aguardando_venda",
			}),
		]);
		expect(resultado.body?.resumo.aguardandoVenda).toBe(1);
	});

	it.each([
		["outra empresa", { idempresa: "empresa-2" }],
		["outro PDV", { numeropdv: 3 }],
	])("trata venda de %s como conflito de identidade", async (_caso, divergencia) => {
		vi.mocked(
			reconciliacaoRepository.buscarVendaParaReconciliacaoNfce,
		).mockResolvedValue({ ...vendaBase, ...divergencia } as never);

		const resultado = await reconciliarNfcePdvService(parametrosBase);

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.itens).toEqual([
			expect.objectContaining({
				idvendalocal: "venda-local-1",
				existeRetaguarda: false,
				acao: "conflito",
				mensagem: "Identidade da venda diverge da empresa ou do PDV",
			}),
		]);
		expect(resultado.body?.resumo.conflitos).toBe(1);
	});

	it("vincula o UUID local à venda antiga encontrada por id remoto", async () => {
		const vendaAntiga = { ...vendaBase, idvendalocal: null };
		vi.mocked(
			reconciliacaoRepository.buscarVendaParaReconciliacaoNfce,
		).mockResolvedValue(vendaAntiga as never);
		vi.mocked(vendaRepository.atualizarVendaPdvGourmet).mockResolvedValue({
			...vendaAntiga,
			idvendalocal: "venda-local-1",
		} as never);
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue(
			notaBase as never,
		);

		const resultado = await reconciliarNfcePdvService({
			...parametrosBase,
			notas: [
				{
					...parametrosBase.notas[0],
					idvendaremoto: vendaAntiga.id,
				},
			],
		});

		expect(
			reconciliacaoRepository.buscarVendaParaReconciliacaoNfce,
		).toHaveBeenCalledWith({
			idempresa: parametrosBase.idempresa,
			numeropdv: parametrosBase.numeropdv,
			idvendalocal: "venda-local-1",
			idvendaremoto: vendaAntiga.id,
		});
		expect(vendaRepository.atualizarVendaPdvGourmet).toHaveBeenCalledWith(
			vendaAntiga.id,
			{ idvendalocal: "venda-local-1" },
		);
		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.itens[0]).toMatchObject({
			idvendalocal: "venda-local-1",
			idvendaremoto: vendaAntiga.id,
			acao: "sincronizada",
		});
	});

	it("recupera e vincula NFC-e rejeitada que ficou órfã da venda", async () => {
		const vendaSemNota = { ...vendaBase, idnotafiscalnfce: null };
		const notaRejeitada = {
			...notaBase,
			status: NFE_STATUS.REJEITADA,
			mensagemtransmissaonfe: "Rejeição 778: Informado NCM inexistente",
		};
		vi.mocked(
			reconciliacaoRepository.buscarVendaParaReconciliacaoNfce,
		).mockResolvedValue(vendaSemNota as never);
		vi.mocked(
			notaRepository.buscarNotaFiscalNfcePorVendaPdv,
		).mockResolvedValue(notaRejeitada as never);
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue(
			notaRejeitada as never,
		);
		vi.mocked(vendaRepository.atualizarVendaPdvGourmet).mockResolvedValue({
			...vendaSemNota,
			idnotafiscalnfce: notaRejeitada.id,
		} as never);

		const resultado = await reconciliarNfcePdvService({
			...parametrosBase,
			notas: [
				{
					idvendalocal: "venda-local-1",
					idvendaremoto: vendaSemNota.id,
					statusLocal: "erro",
				},
			],
		});

		expect(
			notaRepository.buscarNotaFiscalNfcePorVendaPdv,
		).toHaveBeenCalledWith(parametrosBase.idempresa, vendaSemNota.id);
		expect(vendaRepository.atualizarVendaPdvGourmet).toHaveBeenCalledWith(
			vendaSemNota.id,
			{ idnotafiscalnfce: notaRejeitada.id },
		);
		expect(
			contingenciaService.transmitirNfceContingenciaService,
		).not.toHaveBeenCalled();
		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.itens[0]).toMatchObject({
			idvendalocal: "venda-local-1",
			idvendaremoto: vendaSemNota.id,
			idnotafiscal: notaRejeitada.id,
			status: "rejeitada",
			acao: "reconciliada",
		});
		expect(resultado.body?.resumo.reconciliadas).toBe(1);
	});

	it("consulta a SEFAZ quando o PDV autorizou a mesma chave pendente", async () => {
		vi.mocked(
			reconciliacaoRepository.buscarVendaParaReconciliacaoNfce,
		).mockResolvedValue(vendaBase as never);
		vi.mocked(notaRepository.buscarNotaFiscalPorId)
			.mockResolvedValueOnce(notaBase as never)
			.mockResolvedValueOnce({
				...notaBase,
				status: NFE_STATUS.AUTORIZADA,
				protocolonfe: "protocolo-1",
			} as never);
		vi.mocked(
			reconciliarAutorizadaService.reconciliarNfceAutorizadaSefaz,
		).mockResolvedValue({ emitida: true, idnotafiscal: notaBase.id } as never);

		const resultado = await reconciliarNfcePdvService({
			...parametrosBase,
			notas: [
				{
					idvendalocal: "venda-local-1",
					statusLocal: "autorizada",
					chave: chaveNfce,
				},
			],
		});

		expect(
			reconciliarAutorizadaService.reconciliarNfceAutorizadaSefaz,
		).toHaveBeenCalledWith(expect.objectContaining({ id: notaBase.id }));
		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.itens[0]).toMatchObject({
			status: "autorizada",
			acao: "reconciliada",
			protocolo: "protocolo-1",
		});
	});

	it("devolve a retaguarda autorizada como canônica sem consultar a SEFAZ", async () => {
		vi.mocked(
			reconciliacaoRepository.buscarVendaParaReconciliacaoNfce,
		).mockResolvedValue(vendaBase as never);
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue({
			...notaBase,
			status: NFE_STATUS.AUTORIZADA,
			protocolonfe: "protocolo-canonico",
		} as never);

		const resultado = await reconciliarNfcePdvService({
			...parametrosBase,
			notas: [
				{
					idvendalocal: "venda-local-1",
					statusLocal: "pendente",
				},
			],
		});

		expect(
			reconciliarAutorizadaService.reconciliarNfceAutorizadaSefaz,
		).not.toHaveBeenCalled();
		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.itens[0]).toMatchObject({
			status: "autorizada",
			chave: chaveNfce,
			protocolo: "protocolo-canonico",
			acao: "sincronizada",
		});
	});

	it("usa a situação fiscal canônica da retaguarda", () => {
		expect(statusCanonicoNfce(90)).toBe("pendente");
		expect(statusCanonicoNfce(100)).toBe("autorizada");
		expect(statusCanonicoNfce(101)).toBe("cancelada");
		expect(statusCanonicoNfce(102)).toBe("inutilizada");
		expect(statusCanonicoNfce(110)).toBe("rejeitada");
	});
});
