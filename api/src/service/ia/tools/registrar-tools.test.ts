import { beforeEach, describe, expect, it, vi } from "vitest";
import { executarToolPorNome, listarTools } from "./registrar-tools.js";

vi.mock("@/service/entidades/consultar-cnpj-entidade.js", () => ({
	consultarCnpjEntidadeService: vi.fn(),
}));

vi.mock("@/service/entidades/criar-entidade-por-cnpj.js", () => ({
	criarEntidadePorCnpjService: vi.fn(),
}));

vi.mock("@/service/entidades/criar-entidade.js", () => ({
	criarEntidadeService: vi.fn(),
}));

vi.mock("@/service/entidades/listar-entidades.js", () => ({
	listarEntidadesService: vi.fn(),
}));

vi.mock("@/service/dav/listar-davs.js", () => ({
	listarDavsService: vi.fn(),
}));

vi.mock("@/service/dav/buscar-dav.js", () => ({
	buscarDavService: vi.fn(),
}));

vi.mock("@/service/dav/criar-dav.js", () => ({
	criarDavService: vi.fn(),
}));

vi.mock("@/service/dav/faturar-dav-nfe.js", () => ({
	faturarDavNfeService: vi.fn(),
}));

vi.mock("@/service/dav/faturar-dav-nfce.js", () => ({
	faturarDavNfceService: vi.fn(),
}));

vi.mock("@/service/nfe-emissao/consultar-status-sefaz.js", () => ({
	consultarStatusSefazService: vi.fn(),
}));

vi.mock("@/service/nfce-emissao/listar-nfce-pendentes.js", () => ({
	listarNfcePendentesService: vi.fn(),
}));

vi.mock("@/service/relatorios/fluxo-caixa.service.js", () => ({
	gerarRelatorioFluxoCaixa: vi.fn(),
}));

vi.mock("@/service/relatorios/contas-pagar.service.js", () => ({
	gerarRelatorioContasPagar: vi.fn(),
}));

vi.mock("@/service/relatorios/contas-receber.service.js", () => ({
	gerarRelatorioContasReceber: vi.fn(),
}));

vi.mock("@/service/relatorios/despesas-por-categoria.service.js", () => ({
	gerarRelatorioDespesasPorCategoria: vi.fn(),
}));

vi.mock("@/service/relatorios/dre-gerencial.service.js", () => ({
	gerarRelatorioDreGerencial: vi.fn(),
}));

vi.mock("@/service/relatorios/fiscal-compras.service.js", () => ({
	gerarRelatorioFiscalCompras: vi.fn(),
}));

vi.mock("@/service/relatorios/fiscal-vendas.service.js", () => ({
	gerarRelatorioFiscalVendas: vi.fn(),
}));

vi.mock("@/service/relatorios/fiscal-contabilidade.service.js", () => ({
	gerarRelatorioFiscalContabilidade: vi.fn(),
}));

vi.mock("@/service/automacao/crud-automacao.js", () => ({
	listarAutomacoesService: vi.fn(),
}));

vi.mock("@/service/automacao/funcoes/envio-fiscal-contabilidade.js", () => ({
	FUNCAO_ENVIO_FISCAL_CONTABILIDADE: "envio_fiscal_contabilidade",
	executarEnvioFiscalContabilidade: vi.fn(),
}));

vi.mock("@/repositories/empresa-repositories.js", () => ({
	buscarEmpresaPorId: vi.fn(),
}));

vi.mock("@/service/dashboard/buscar-dados-dashboard.js", () => ({
	buscarDadosDashboardService: vi.fn(),
	buscarHistoricoFinanceiroService: vi.fn(),
}));

vi.mock("@/service/dashboard/buscar-ultimas-movimentacoes.js", () => ({
	buscarUltimasMovimentacoesService: vi.fn(),
}));

describe("registrar-tools", () => {
	const ctx = { idusuario: "user-1", idempresa: "emp-1" };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve registrar as tools do MVP", () => {
		const nomes = listarTools().map((t) => t.nome);
		expect(nomes).toContain("consultar_cnpj");
		expect(nomes).toContain("criar_cliente_pj_cnpj");
		expect(nomes).toContain("criar_cliente_pf");
		expect(nomes).toContain("gerar_relatorio");
		expect(nomes).toContain("enviar_docs_contabilidade");
		expect(nomes).toContain("faturar_pedido_nfe");
		expect(nomes).toContain("consultar_dashboard");
	});

	it("deve bloquear mutação sem confirmado=true", async () => {
		const { resultado, acao } = await executarToolPorNome(
			"criar_cliente_pj_cnpj",
			ctx,
			{ cnpj: "12345678000199", confirmado: false },
		);

		expect(resultado.ok).toBe(false);
		expect(acao.status).toBe("bloqueado");
		expect(resultado.resumo).toMatch(/confirmação/i);

		const { criarEntidadePorCnpjService } = await import(
			"@/service/entidades/criar-entidade-por-cnpj.js"
		);
		expect(criarEntidadePorCnpjService).not.toHaveBeenCalled();
	});

	it("deve executar criar_cliente_pj_cnpj com confirmado", async () => {
		const { criarEntidadePorCnpjService } = await import(
			"@/service/entidades/criar-entidade-por-cnpj.js"
		);
		vi.mocked(criarEntidadePorCnpjService).mockResolvedValue({
			success: true,
			status: 201,
			body: { id: "ent-1", nome: "Empresa Teste" } as never,
		});

		const { resultado, acao } = await executarToolPorNome(
			"criar_cliente_pj_cnpj",
			ctx,
			{ cnpj: "12345678000199", confirmado: true },
		);

		expect(resultado.ok).toBe(true);
		expect(acao.status).toBe("sucesso");
		expect(criarEntidadePorCnpjService).toHaveBeenCalledWith(
			expect.objectContaining({
				cnpj: "12345678000199",
				cliente: 1,
				idempresa: "emp-1",
			}),
		);
	});

	it("deve retornar erro para tool desconhecida", async () => {
		const { resultado, acao } = await executarToolPorNome(
			"tool_inexistente",
			ctx,
			{},
		);
		expect(resultado.ok).toBe(false);
		expect(acao.status).toBe("erro");
	});

	it("deve validar argumentos com Zod", async () => {
		const { resultado, acao } = await executarToolPorNome(
			"buscar_pedido",
			ctx,
			{ iddav: "nao-e-uuid" },
		);
		expect(resultado.ok).toBe(false);
		expect(acao.status).toBe("erro");
		expect(resultado.resumo).toMatch(/inválidos/i);
	});
});
