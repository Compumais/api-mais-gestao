import { beforeEach, describe, expect, it, vi } from "vitest";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { consultarRelatorioNotasFiscais } from "@/repositories/relatorio-notas-fiscais-repositories.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import {
	calcularResumoRelatorioNotasFiscais,
	listarRelatorioNotasFiscaisService,
	mapearLinhaRelatorioNotaFiscal,
} from "./listar-relatorio-notas-fiscais.service.js";

vi.mock("@/repositories/entidade-repositories.js", () => ({
	verificarUsuarioPertenceEmpresa: vi.fn(),
}));
vi.mock("@/repositories/relatorio-notas-fiscais-repositories.js", () => ({
	consultarRelatorioNotasFiscais: vi.fn(),
}));

describe("listarRelatorioNotasFiscaisService", () => {
	beforeEach(() => vi.clearAllMocks());

	it("bloqueia consulta de outra empresa", async () => {
		vi.mocked(verificarUsuarioPertenceEmpresa).mockResolvedValue(false);
		const resposta = await listarRelatorioNotasFiscaisService({
			idusuario: "usuario",
			filtros: {
				idempresa: "11111111-1111-4111-8111-111111111111",
				dataInicio: "2026-09-01",
				dataFim: "2026-09-30",
				ambiente: "todos",
				status: "todos",
				modelo: "todos",
				page: 1,
				limit: 20,
			},
		});
		expect(resposta.success).toBe(false);
		expect(consultarRelatorioNotasFiscais).not.toHaveBeenCalled();
	});

	it("une inutilização como evento sem fingir autorização", async () => {
		vi.mocked(verificarUsuarioPertenceEmpresa).mockResolvedValue(true);
		vi.mocked(consultarRelatorioNotasFiscais).mockResolvedValue({
			registros: [
				{
					id: "inutil-1",
					dataHora: "2026-09-17T08:00:00-03:00",
					modelo: "65",
					serie: "1",
					numero: "42",
					chave: "123",
					protocolo: "135260000000001",
					destinatario: "Consumidor",
					valorTotal: "99.90",
					status: NFE_STATUS.INUTILIZADA,
					ambiente: 2,
				},
			],
			total: 1,
			agrupamentos: [
				{
					status: NFE_STATUS.INUTILIZADA,
					ambiente: 2,
					quantidade: 1,
				},
			],
		});

		const resposta = await listarRelatorioNotasFiscaisService({
			idusuario: "usuario",
			filtros: {
				idempresa: "11111111-1111-4111-8111-111111111111",
				dataInicio: "2026-09-01",
				dataFim: "2026-09-30",
				ambiente: "2",
				status: "inutilizada",
				modelo: "65",
				page: 1,
				limit: 20,
			},
		});

		expect(resposta.success).toBe(true);
		if (!resposta.success) return;
		expect(resposta.body.data[0]).toMatchObject({
			tipo: "INUTILIZACAO",
			chave: null,
			destinatario: null,
			valorTotal: null,
			numeroInicial: "42",
			numeroFinal: "42",
			ambienteLabel: "Homologação",
		});
	});
});

describe("mapeamento e resumos fiscais", () => {
	it("mantém ambiente desconhecido separado de produção", () => {
		const linha = mapearLinhaRelatorioNotaFiscal({
			id: "n1",
			dataHora: null,
			modelo: "55",
			serie: "1",
			numero: "1",
			chave: null,
			protocolo: null,
			destinatario: "Cliente",
			valorTotal: "10",
			status: NFE_STATUS.PENDENTE,
			ambiente: null,
		});
		expect(linha?.ambiente).toBeNull();
		expect(linha?.ambienteLabel).toBe("Não informado");
	});

	it("resume status e ambiente sem dupla contagem", () => {
		const resumo = calcularResumoRelatorioNotasFiscais([
			{ status: NFE_STATUS.AUTORIZADA, ambiente: 1, quantidade: 3 },
			{ status: NFE_STATUS.CANCELADA, ambiente: 1, quantidade: 1 },
			{ status: NFE_STATUS.CANCELADA_FORA_PRAZO, ambiente: 2, quantidade: 1 },
			{ status: NFE_STATUS.INUTILIZADA, ambiente: 2, quantidade: 2 },
			{ status: NFE_STATUS.REJEITADA, ambiente: null, quantidade: 1 },
		]);
		expect(resumo.total).toBe(8);
		expect(resumo.porStatus).toEqual({
			emitidasPendentes: 1,
			autorizadas: 3,
			canceladas: 2,
			inutilizadas: 2,
		});
		expect(resumo.porAmbiente).toEqual({
			producao: 4,
			homologacao: 3,
			naoInformado: 1,
		});
	});
});
