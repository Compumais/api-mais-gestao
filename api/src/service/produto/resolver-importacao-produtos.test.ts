import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cestRepo from "@/repositories/cest-repositories.js";
import * as cfopRepo from "@/repositories/cfop-repositories.js";
import * as hierarquiaRepo from "@/repositories/hierarquia-repositories.js";
import * as ncmRepo from "@/repositories/ncm-repositories.js";
import * as produtosRepo from "@/repositories/produtos-repositories.js";
import * as unidadeRepo from "@/repositories/unidade-medida-repositories.js";
import type { ResultadoValidacaoImportacaoProdutos } from "@/util/produtos-importacao.js";
import {
	montarDadosProdutoImportacao,
	resolverProdutosImportacao,
} from "./resolver-importacao-produtos.js";

vi.mock("@/repositories/cest-repositories.js");
vi.mock("@/repositories/cfop-repositories.js");
vi.mock("@/repositories/hierarquia-repositories.js");
vi.mock("@/repositories/ncm-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/repositories/unidade-medida-repositories.js");

function validacaoBase(): ResultadoValidacaoImportacaoProdutos {
	return {
		errosGerais: [],
		totalProdutos: 1,
		totalErros: 0,
		produtos: [
			{
				linha: 2,
				codigo: 10,
				ean: "7891000055120",
				referencia: "REF01",
				nome: "Refrigerante 2L",
				grupo: "BEBIDAS",
				unidade: "UN",
				preco: "9.90",
				custo: "5.50",
				ncm: "22021000",
				cest: null,
				origem: 0,
				mva: "40.00",
				estoque: 10,
				ippt: "P",
				cfopSaida: null,
				cfopEntrada: null,
				cfopNfce: null,
				cst: null,
				csosn: null,
				aliquotas: {
					aliquotaicmsinterna: "18.00",
					aliquotaicmsdiferencialentrada: null,
					aliquotareducaoicmsnfcesat: null,
					aliquotafcpnf: null,
					ultimaaliquotaicmsst: null,
					ultimaaliquotafcpst: null,
					aliquotapis: "1.65",
					aliquotapisentrada: null,
					aliquotacofins: "7.60",
					aliquotaconfinsentrada: null,
					aliquotapisconfinssaidapreco: null,
					aliquotapisconfinsentradapreco: null,
					aliquotaiss: null,
				},
				erros: [],
			},
		],
	};
}

describe("resolverProdutosImportacao", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(hierarquiaRepo.listarHierarquiasPorEmpresa).mockResolvedValue([
			{ id: "grupo-1", codigo: "01", nome: "BEBIDAS" },
		]);
		vi.mocked(unidadeRepo.listarUnidadesMedidaPorEmpresa).mockResolvedValue([
			{ id: "un-1", codigo: "UN", idempresa: "emp-1" },
		]);
		vi.mocked(produtosRepo.listarIdentificadoresProdutos).mockResolvedValue([]);
		vi.mocked(ncmRepo.buscarNcmPorCodigo).mockResolvedValue(undefined as never);
		vi.mocked(cestRepo.buscarCestPorCodigo).mockResolvedValue(
			undefined as never,
		);
		vi.mocked(cfopRepo.buscarCfopPorCodigo).mockResolvedValue(
			undefined as never,
		);
	});

	it("marca erro quando o grupo não existe", async () => {
		vi.mocked(hierarquiaRepo.listarHierarquiasPorEmpresa).mockResolvedValue([]);

		const resolvidos = await resolverProdutosImportacao({
			idempresa: "emp-1",
			validacao: validacaoBase(),
		});

		expect(resolvidos[0]?.erros.join(" ")).toContain("Grupo");
	});

	it("atualiza produto existente pelo código", async () => {
		vi.mocked(produtosRepo.listarIdentificadoresProdutos).mockResolvedValue([
			{ id: "prod-1", codigo: 10, ean: "7891000055120" },
		]);

		const resolvidos = await resolverProdutosImportacao({
			idempresa: "emp-1",
			validacao: validacaoBase(),
		});

		expect(resolvidos[0]?.acao).toBe("atualizar");
		expect(resolvidos[0]?.idExistente).toBe("prod-1");
	});
});

describe("montarDadosProdutoImportacao", () => {
	it("persiste MVA e alíquotas informadas", () => {
		const dados = montarDadosProdutoImportacao("emp-1", {
			...validacaoBase().produtos[0],
			acao: "criar",
			idExistente: null,
			codigoFinal: 10,
			idgrupo: "grupo-1",
			idunidademedida: "un-1",
			unidademedida: "UN",
			idncm: null,
			idcest: null,
			idcfopentrada: null,
			idcfopsaida: null,
			idcfopsaidanfce: null,
			erros: [],
		});

		expect(dados.percentualmva).toBe("40.00");
		expect(dados.aliquotaicmsinterna).toBe("18.00");
		expect(dados.aliquotapis).toBe("1.65");
		expect(dados.aliquotacofins).toBe("7.60");
		expect(dados.aliquotaiss).toBeUndefined();
	});
});
