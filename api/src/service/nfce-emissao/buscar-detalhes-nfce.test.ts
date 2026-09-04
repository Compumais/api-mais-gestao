import { beforeEach, describe, expect, it, vi } from "vitest";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { buscarDetalhesNfceService } from "./buscar-detalhes-nfce.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/venda-pdv-item-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/repositories/cfop-repositories.js");
vi.mock("@/repositories/ncm-repositories.js");
vi.mock("@/repositories/empresa-fiscal-repositories.js");
vi.mock("@/service/nfce-emissao/resolver-venda-nfce.js");
vi.mock("@/service/configuracao-usuario/buscar-configuracao-usuario.js");

const ID_USUARIO = "11111111-1111-1111-1111-111111111111";
const ID_EMPRESA = "22222222-2222-2222-2222-222222222222";
const ID_NOTA = "33333333-3333-3333-3333-333333333333";
const ID_VENDA = "44444444-4444-4444-4444-444444444444";

async function mocks() {
	const entidade = await import("@/repositories/entidade-repositories.js");
	const notaRepo = await import("@/repositories/nota-fiscal-repositories.js");
	const itemRepo = await import(
		"@/repositories/venda-pdv-item-repositories.js"
	);
	const produtoRepo = await import("@/repositories/produtos-repositories.js");
	const cfopRepo = await import("@/repositories/cfop-repositories.js");
	const ncmRepo = await import("@/repositories/ncm-repositories.js");
	const fiscalRepo = await import(
		"@/repositories/empresa-fiscal-repositories.js"
	);
	const resolver = await import(
		"@/service/nfce-emissao/resolver-venda-nfce.js"
	);
	const config = await import(
		"@/service/configuracao-usuario/buscar-configuracao-usuario.js"
	);

	return {
		entidade,
		notaRepo,
		itemRepo,
		produtoRepo,
		cfopRepo,
		ncmRepo,
		fiscalRepo,
		resolver,
		config,
	};
}

describe("buscarDetalhesNfceService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("retorna 403 quando o usuário não pertence à empresa", async () => {
		const { entidade } = await mocks();
		vi.mocked(entidade.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			false,
		);

		const resultado = await buscarDetalhesNfceService({
			idusuario: ID_USUARIO,
			idempresa: ID_EMPRESA,
			idnotafiscal: ID_NOTA,
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
		}
	});

	it("retorna 404 quando a NFC-e não existe", async () => {
		const { entidade, resolver, notaRepo } = await mocks();
		vi.mocked(entidade.verificarUsuarioPertenceEmpresa).mockResolvedValue(true);
		vi.mocked(resolver.resolverVendaPorNotaFiscalNfce).mockResolvedValue(null);
		vi.mocked(notaRepo.buscarNotaFiscalPorId).mockResolvedValue(undefined);

		const resultado = await buscarDetalhesNfceService({
			idusuario: ID_USUARIO,
			idempresa: ID_EMPRESA,
			idnotafiscal: ID_NOTA,
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
		}
	});

	it("retorna itens, pagamentos e rejeição da NFC-e", async () => {
		const {
			entidade,
			resolver,
			itemRepo,
			produtoRepo,
			cfopRepo,
			ncmRepo,
			fiscalRepo,
			config,
		} = await mocks();

		vi.mocked(entidade.verificarUsuarioPertenceEmpresa).mockResolvedValue(true);
		vi.mocked(resolver.resolverVendaPorNotaFiscalNfce).mockResolvedValue({
			nota: {
				id: ID_NOTA,
				idempresa: ID_EMPRESA,
				modelo: "65",
				numeronotafiscal: "101",
				serie: "1",
				chavenfe: "35260812345678000190650010000001011000000010",
				protocolonfe: null,
				status: NFE_STATUS.REJEITADA,
				tipoambientenfe: 2,
				valortotalnota: "18.00",
				emissao: "2026-09-04",
				datahoraemissao: "2026-09-04T14:00:00-03:00",
				mensagemtransmissaonfe: "Rejeicao 778: Informado NCM inexistente",
				codigostatusprotocolonfe: 778,
			},
			venda: {
				id: ID_VENDA,
				valordinheiro: "20.00",
				valorcartao: null,
				valorcartaocredito: null,
				valorcartaodebito: null,
				valorpix: null,
				valorprepago: null,
				valortroco: "2.00",
				valortotal: "18.00",
			},
		} as never);

		vi.mocked(itemRepo.listarItensPorVendaPdv).mockResolvedValue([
			{
				idproduto: "prod-1",
				descricao: "Refrigerante",
				quantidade: "2",
				precounitario: "9.00",
			},
		] as never);

		vi.mocked(produtoRepo.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			nome: "Refrigerante",
			descricao: "Refrigerante",
			codigo: 10,
			ncm: "22021000",
			idncm: null,
			unidademedida: "UN",
			idcfopsaidanfce: "cfop-1",
			idcfopsaida: null,
			idcfopsaidaexterna: null,
			situacaotributaria: null,
			tributacaosn: "102",
			situacaotributariasn: null,
		} as never);

		vi.mocked(cfopRepo.buscarCfopPorId).mockResolvedValue({
			codigo: "5102",
		} as never);
		vi.mocked(ncmRepo.buscarNcmPorId).mockResolvedValue(undefined);
		vi.mocked(fiscalRepo.buscarEmpresaFiscalPorEmpresa).mockResolvedValue({
			crt: 1,
			uf: "MG",
		} as never);
		vi.mocked(config.buscarConfiguracaoUsuarioService).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				id: "cfg-1",
				idusuario: ID_USUARIO,
				integracoes: { geminiApiKey: "gem-key" },
				criadoem: "",
				atualizadoem: "",
			},
		});

		const resultado = await buscarDetalhesNfceService({
			idusuario: ID_USUARIO,
			idempresa: ID_EMPRESA,
			idnotafiscal: ID_NOTA,
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body).toEqual(
			expect.objectContaining({
				iaDisponivel: true,
				troco: 2,
				rejeicao: {
					cStat: "778",
					xMotivo: "Rejeicao 778: Informado NCM inexistente",
				},
			}),
		);
		expect(resultado.body?.itens[0]).toEqual(
			expect.objectContaining({
				nome: "Refrigerante",
				quantidade: "2",
				cfop: "5102",
				ncm: "22021000",
				csosn: "102",
			}),
		);
		expect(resultado.body?.pagamentos).toEqual([
			{ meio: "dinheiro", label: "Dinheiro", valor: 18 },
		]);
	});

	it("marca iaDisponivel=false quando não há chave", async () => {
		const { entidade, resolver, itemRepo, fiscalRepo, config } = await mocks();

		vi.mocked(entidade.verificarUsuarioPertenceEmpresa).mockResolvedValue(true);
		vi.mocked(resolver.resolverVendaPorNotaFiscalNfce).mockResolvedValue({
			nota: {
				id: ID_NOTA,
				idempresa: ID_EMPRESA,
				modelo: "65",
				numeronotafiscal: "1",
				serie: "1",
				chavenfe: null,
				protocolonfe: null,
				status: NFE_STATUS.AUTORIZADA,
				tipoambientenfe: 2,
				valortotalnota: "10.00",
				emissao: null,
				datahoraemissao: null,
				mensagemtransmissaonfe: null,
				codigostatusprotocolonfe: 100,
			},
			venda: {
				id: ID_VENDA,
				valordinheiro: "10.00",
				valortroco: "0",
			},
		} as never);
		vi.mocked(itemRepo.listarItensPorVendaPdv).mockResolvedValue([]);
		vi.mocked(fiscalRepo.buscarEmpresaFiscalPorEmpresa).mockResolvedValue(
			undefined,
		);
		vi.mocked(config.buscarConfiguracaoUsuarioService).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				id: "cfg-1",
				idusuario: ID_USUARIO,
				integracoes: {},
				criadoem: "",
				atualizadoem: "",
			},
		});

		const { notaRepo } = await mocks();
		vi.mocked(notaRepo.listarItensPorNotaFiscal).mockResolvedValue([]);

		const resultado = await buscarDetalhesNfceService({
			idusuario: ID_USUARIO,
			idempresa: ID_EMPRESA,
			idnotafiscal: ID_NOTA,
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.iaDisponivel).toBe(false);
		expect(resultado.body?.rejeicao).toBeNull();
	});
});
