import { beforeEach, describe, expect, it, vi } from "vitest";
import { aplicarRevalidacaoProdutosNotaService } from "./aplicar-revalidacao-produtos-nota.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/auditoria-entrada-nf-repositories.js");
vi.mock("@/repositories/local-estoque-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/service/nota-fiscal/registrar-movimentos-estoque-nf.js");
vi.mock("@/service/nota-fiscal/importacao/resolver-referencias-importacao.js");

import * as auditoriaRepositories from "@/repositories/auditoria-entrada-nf-repositories.js";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as localEstoqueRepositories from "@/repositories/local-estoque-repositories.js";
import * as produtosRepositories from "@/repositories/produtos-repositories.js";
import * as resolverReferencias from "@/service/nota-fiscal/importacao/resolver-referencias-importacao.js";
import * as movimentosEstoqueNf from "@/service/nota-fiscal/registrar-movimentos-estoque-nf.js";

const parametros = {
	idusuario: "usuario-1",
	idempresa: "empresa-1",
	idnotafiscal: "nf-1",
};

function item(overrides?: Record<string, unknown>) {
	return {
		idnotafiscal: "nf-1",
		numero: "10",
		numeronotafiscal: "10",
		chavenfe: "chave",
		iditem: "item-1",
		contador: 1,
		descricao: "Refrigerante",
		idproduto: "prod-1",
		quantidade: "2.500000",
		ncmItem: "22021000",
		idncmItem: "ncm-novo",
		idcfopItem: "cfop-entrada-novo",
		cestItem: "1708700",
		situacaotributariaItem: "00",
		cstpisItem: "50",
		cstcofinsItem: "50",
		cstipiItem: "49",
		dadosimportacao: {
			idcest: "cest-novo",
			eanXml: "7891234567895",
			quantidadeEstoque: "2.5",
			precounitarioEstoque: "10.00",
		},
		nomeProduto: "Refri",
		ncmProduto: "00000000",
		idncmProduto: "ncm-velho",
		idcestProduto: "cest-velho",
		cestProduto: 1111111,
		idcfopentradaProduto: "cfop-velho",
		eanProduto: "1111111111111",
		custoaquisicaoProduto: null,
		precoultimacompraProduto: null,
		precounitarioItem: "10.00",
		situacaotributariasnentradaProduto: "60",
		cstpisentradaProduto: "01",
		cstcofinsentradaProduto: "01",
		cstipientradaProduto: "00",
		idcfopsaidaProduto: "cfop-saida-valido",
		idcfopsaidanfceProduto: "cfop-saida-valido",
		situacaotributariaProduto: "60",
		cstpisProduto: "01",
		cstcofinsProduto: "01",
		quantidadepadrao: 7,
		...overrides,
	};
}

function movimento(overrides?: Record<string, unknown>) {
	return {
		idoriginal: "nf-1",
		iditemoriginal: "item-1",
		quantidadeentrada: "2.500000",
		cancelado: 0,
		...overrides,
	};
}

describe("aplicar revalidação de produtos da nota confirmada", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(entidadeRepositories.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(auditoriaRepositories.buscarNotaCompraConfirmada).mockResolvedValue({
			id: "nf-1",
			numero: "10",
			numeronotafiscal: "10",
			chavenfe: "chave",
			status: 1,
			tipoorigem: 0,
			entradasaida: "2026-01-10",
			idlocalestoque: "local-1",
		} as never);
		vi.mocked(
			localEstoqueRepositories.garantirLocalEstoqueEmpresa,
		).mockResolvedValue({
			local: { id: "local-1" },
			criado: false,
		} as never);
		vi.mocked(produtosRepositories.atualizarProduto).mockResolvedValue({} as never);
		vi.mocked(movimentosEstoqueNf.registrarMovimentosEstoqueNf).mockResolvedValue({
			movimentosCriados: 1,
			avisos: [],
		});
		vi.mocked(resolverReferencias.resolverCfopSaidaDeEntrada).mockResolvedValue({
			id: "cfop-saida-novo",
			codigo: "5102",
		});
		vi.mocked(auditoriaRepositories.listarMovimentosPorNotas).mockResolvedValue([]);
	});

	it("atualiza EAN, CEST e tributação de entrada divergentes", async () => {
		vi.mocked(
			auditoriaRepositories.listarItensCompraConfirmadaAuditoria,
		).mockResolvedValue([item()] as never);
		vi.mocked(auditoriaRepositories.listarMovimentosPorNotas).mockResolvedValue([
			movimento(),
		] as never);

		const resultado = await aplicarRevalidacaoProdutosNotaService(parametros);
		const patch = vi.mocked(produtosRepositories.atualizarProduto).mock.calls[0]?.[1];

		expect(resultado.success).toBe(true);
		expect(patch).toMatchObject({
			ean: "7891234567895",
			eantributavel: "7891234567895",
			idcest: "cest-novo",
			cest: 1708700,
			ncm: "22021000",
			idncm: "ncm-novo",
			idcfopentrada: "cfop-entrada-novo",
			situacaotributariasnentrada: "00",
			cstpisentrada: "50",
			cstcofinsentrada: "50",
			cstipientrada: "49",
			custoaquisicao: "10.00",
			precoultimacompra: "10.00",
		});
		expect(patch).not.toHaveProperty("quantidadepadrao");
		expect(patch).not.toHaveProperty("situacaotributaria");
		expect(patch).not.toHaveProperty("idcfopsaida");
		expect(movimentosEstoqueNf.registrarMovimentosEstoqueNf).not.toHaveBeenCalled();
	});

	it("não apaga EAN nem CEST quando a nota não tem o dado", async () => {
		vi.mocked(
			auditoriaRepositories.listarItensCompraConfirmadaAuditoria,
		).mockResolvedValue([
			item({
				cestItem: null,
				dadosimportacao: { quantidadeEstoque: "2.5" },
				ncmProduto: "00000000",
			}),
		] as never);
		vi.mocked(auditoriaRepositories.listarMovimentosPorNotas).mockResolvedValue([
			movimento(),
		] as never);

		await aplicarRevalidacaoProdutosNotaService(parametros);
		const patch = vi.mocked(produtosRepositories.atualizarProduto).mock.calls[0]?.[1];

		expect(patch).toMatchObject({ ncm: "22021000" });
		expect(patch).not.toHaveProperty("ean");
		expect(patch).not.toHaveProperty("eantributavel");
		expect(patch).not.toHaveProperty("idcest");
		expect(patch).not.toHaveProperty("cest");
	});

	it("não sobrescreve CST de saída válido e só preenche CFOP de saída vazio", async () => {
		vi.mocked(
			auditoriaRepositories.listarItensCompraConfirmadaAuditoria,
		).mockResolvedValue([
			item({ iditem: "item-com-saida", idproduto: "prod-com-saida" }),
			item({
				iditem: "item-sem-cfop-saida",
				idproduto: "prod-sem-cfop-saida",
				ncmProduto: "22021000",
				idncmProduto: "ncm-novo",
				idcestProduto: "cest-novo",
				cestProduto: 1708700,
				idcfopentradaProduto: "cfop-entrada-novo",
				eanProduto: "7891234567895",
				situacaotributariasnentradaProduto: "00",
				cstpisentradaProduto: "50",
				cstcofinsentradaProduto: "50",
				cstipientradaProduto: "49",
				idcfopsaidaProduto: null,
				idcfopsaidanfceProduto: null,
				situacaotributariaProduto: "60",
			}),
		] as never);
		vi.mocked(auditoriaRepositories.listarMovimentosPorNotas).mockResolvedValue([
			movimento({ iditemoriginal: "item-com-saida" }),
			movimento({ iditemoriginal: "item-sem-cfop-saida" }),
		] as never);

		await aplicarRevalidacaoProdutosNotaService(parametros);
		const chamadas = vi.mocked(produtosRepositories.atualizarProduto).mock.calls;
		const comSaida = chamadas.find((chamada) => chamada[0] === "prod-com-saida")?.[1];
		const semCfop = chamadas.find((chamada) => chamada[0] === "prod-sem-cfop-saida")?.[1];

		expect(comSaida).not.toHaveProperty("situacaotributaria");
		expect(comSaida).not.toHaveProperty("cstpis");
		expect(comSaida).not.toHaveProperty("cstcofins");
		expect(comSaida).not.toHaveProperty("idcfopsaida");
		expect(comSaida?.situacaotributariasnentrada).toBe("00");
		expect(semCfop).toMatchObject({
			idcfopsaida: "cfop-saida-novo",
			idcfopsaidanfce: "cfop-saida-novo",
		});
		expect(semCfop).not.toHaveProperty("situacaotributaria");
	});

	it("sem movimento cria uma entrada e não soma quantidadepadrao", async () => {
		vi.mocked(
			auditoriaRepositories.listarItensCompraConfirmadaAuditoria,
		).mockResolvedValue([item()] as never);

		const resultado = await aplicarRevalidacaoProdutosNotaService(parametros);
		const patch = vi.mocked(produtosRepositories.atualizarProduto).mock.calls[0]?.[1];

		expect(patch).not.toHaveProperty("quantidadepadrao");
		expect(movimentosEstoqueNf.registrarMovimentosEstoqueNf).toHaveBeenCalledTimes(1);
		expect(movimentosEstoqueNf.registrarMovimentosEstoqueNf).toHaveBeenCalledWith(
			expect.objectContaining({
				idnotafiscal: "nf-1",
				idlocalestoque: "local-1",
				sentido: "entrada",
				itens: [
					expect.objectContaining({
						iditem: "item-1",
						idproduto: "prod-1",
						quantidade: "2.500000",
					}),
				],
			}),
		);
		expect(resultado.body?.itens[0]?.estoque).toBe("lancado");
	});

	it("cria o local padrão e lança estoque quando a nota e a empresa não têm local", async () => {
		vi.mocked(auditoriaRepositories.buscarNotaCompraConfirmada).mockResolvedValue({
			id: "nf-1",
			numero: "10",
			numeronotafiscal: "10",
			chavenfe: "chave",
			status: 1,
			tipoorigem: 0,
			entradasaida: "2026-01-10",
			idlocalestoque: null,
		} as never);
		vi.mocked(
			localEstoqueRepositories.garantirLocalEstoqueEmpresa,
		).mockResolvedValue({
			local: { id: "local-novo" },
			criado: true,
		} as never);
		vi.mocked(
			auditoriaRepositories.listarItensCompraConfirmadaAuditoria,
		).mockResolvedValue([item()] as never);

		const resultado = await aplicarRevalidacaoProdutosNotaService(parametros);

		expect(movimentosEstoqueNf.registrarMovimentosEstoqueNf).toHaveBeenCalledWith(
			expect.objectContaining({ idlocalestoque: "local-novo" }),
		);
		expect(resultado.body?.itens[0]?.estoque).toBe("lancado");
		expect(resultado.body?.avisos.join(" ")).toMatch(/local padrão Estoque/i);
	});

	it("não cria segundo movimento quando a quantidade já foi inserida", async () => {
		vi.mocked(
			auditoriaRepositories.listarItensCompraConfirmadaAuditoria,
		).mockResolvedValue([item()] as never);
		vi.mocked(auditoriaRepositories.listarMovimentosPorNotas).mockResolvedValue([
			movimento(),
		] as never);

		const resultado = await aplicarRevalidacaoProdutosNotaService(parametros);

		expect(movimentosEstoqueNf.registrarMovimentosEstoqueNf).not.toHaveBeenCalled();
		expect(resultado.body?.itens[0]?.estoque).toBe("ja_inserido");
	});

	it("não lança estoque quando a quantidade diverge ou o movimento não tem o item", async () => {
		vi.mocked(
			auditoriaRepositories.listarItensCompraConfirmadaAuditoria,
		).mockResolvedValue([
			item({ iditem: "item-divergente", idproduto: "prod-divergente" }),
			item({ iditem: "item-ambiguo", idproduto: "prod-ambiguo" }),
		] as never);
		vi.mocked(auditoriaRepositories.listarMovimentosPorNotas).mockResolvedValue([
			movimento({ iditemoriginal: "item-divergente", quantidadeentrada: "1.000000" }),
			movimento({ iditemoriginal: null, quantidadeentrada: "2.500000" }),
		] as never);

		const resultado = await aplicarRevalidacaoProdutosNotaService(parametros);
		const divergente = resultado.body?.itens.find((linha) => linha.iditem === "item-divergente");
		const ambiguo = resultado.body?.itens.find((linha) => linha.iditem === "item-ambiguo");

		expect(movimentosEstoqueNf.registrarMovimentosEstoqueNf).not.toHaveBeenCalled();
		expect(divergente?.estoque).toBe("nao_corrigido");
		expect(divergente?.motivoEstoque).toMatch(/difere da nota/i);
		expect(ambiguo?.estoque).toBe("nao_corrigido");
		expect(ambiguo?.motivoEstoque).toMatch(/sem vínculo do item/i);
	});
});
