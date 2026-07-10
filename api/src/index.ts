import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyReply, FastifyRequest } from "fastify";
import Fastify from "fastify";
import { adminRotas } from "./controllers/http/admin/rotas.js";
import { areasRotas } from "./controllers/http/area/rotas.js";
import { assinaturasRotas } from "./controllers/http/assinaturas/rotas.js";
import { auditoriaRotas } from "./controllers/http/auditoria/rotas.js";
// import { authRotas } from "./controllers/http/auth/rotas.js";
import { obterPerfil } from "./controllers/http/auth/obter-perfil.js";
import { authenticationRoute } from "./controllers/http/authentication.js";
import { bancosRotas } from "./controllers/http/bancos/rotas.js";
import { centrosCustoRotas } from "./controllers/http/centro-custo/rotas.js";
import { certificadoDigitalRotas } from "./controllers/http/certificado-digital/rotas.js";
import { cestsRotas } from "./controllers/http/cest/rotas.js";
import { cfopsRotas } from "./controllers/http/cfop/rotas.js";
import { cfopDeParaRotas } from "./controllers/http/cfop-depara/rotas.js";
import { cfopsPadraoRotas } from "./controllers/http/cfop-padrao/rotas.js";
import { codigosReduzidosContaContabilRotas } from "./controllers/http/codigo-reduzido-conta-contabil/rotas.js";
import { condicoesPagamentoRotas } from "./controllers/http/condicao-pagamento/rotas.js";
import { configuracaoRotas } from "./controllers/http/configuracao/rotas.js";
import { configuracaoUsuarioRotas } from "./controllers/http/configuracao-usuario/rotas.js";
import { contaContabilRotas } from "./controllers/http/conta-contabil/rotas.js";
import { contaCorrenteLancamentoRotas } from "./controllers/http/conta-corrente-lancamento/rotas.js";
import { contasMesaRotas } from "./controllers/http/conta-mesa/rotas.js";
import { contasMesaItemRotas } from "./controllers/http/conta-mesa-item/rotas.js";
import { contabilidadeRotas } from "./controllers/http/contabilidade/rotas.js";
import { automacaoRotas } from "./controllers/http/automacao/rotas.js";
import { contaCorrenteRotas } from "./controllers/http/contacorrente/rotas.js";
import { custosProdutoRotas } from "./controllers/http/custo-produto/rotas.js";
import { dashboardRotas } from "./controllers/http/dashboard/rotas.js";
import { davsRotas } from "./controllers/http/dav/rotas.js";
import { departamentosRotas } from "./controllers/http/departamento/rotas.js";
import { emailRotas } from "./controllers/http/email/rotas.js";
import { empresaFiscalRotas } from "./controllers/http/empresa-fiscal/rotas.js";
import { empresasRotas } from "./controllers/http/empresas/rotas.js";
import { enquadramentosIpiRotas } from "./controllers/http/enquatramento-ipi/rotas.js";
import { entidadesContaContabilRotas } from "./controllers/http/entidade-conta-contabil/rotas.js";
import { entidadesRotas } from "./controllers/http/entidades/rotas.js";
import { estoqueRotas } from "./controllers/http/estoque/rotas.js";
import { fatoresConversaoRotas } from "./controllers/http/fator-conversao/rotas.js";
import { fechamentosCaixaRotas } from "./controllers/http/fechamento-caixa/rotas.js";
import { financeiroRotas } from "./controllers/http/financeiro/rotas.js";
import { financeiroLancamentoRotas } from "./controllers/http/financeirolancamento/rotas.js";
import { healthRotas } from "./controllers/http/health/rotas.js";
import { hierarquiasRotas } from "./controllers/http/hierarquia/rotas.js";
import { iaRotas } from "./controllers/http/ia/rotas.js";
import { informativosRotas } from "./controllers/http/informativos/rotas.js";
import { integracoesContabilConfiguracaoRotas } from "./controllers/http/integracao-contabil-configuracao/rotas.js";
import { locaisEstoqueRotas } from "./controllers/http/local-estoque/rotas.js";
import { locaisRetiradaRotas } from "./controllers/http/local-retirada/rotas.js";
import { localidadesRotas } from "./controllers/http/localidade/rotas.js";
import { motivosRebaixaRotas } from "./controllers/http/motivo-rebaixa/rotas.js";
import { movimentosEstoqueRotas } from "./controllers/http/movimento-estoque/rotas.js";
import { nfceRotas } from "./controllers/http/nfce/rotas.js";
import { nfceConfiguracaoRotas } from "./controllers/http/nfce-configuracao/rotas.js";
import { nfeConfiguracaoRotas } from "./controllers/http/nfe-configuracao/rotas.js";
import { nfeEmissaoRotas } from "./controllers/http/nfe-emissao/rotas.js";
import { nfeInboundRotas } from "./controllers/http/nfe-inbound/rotas.js";
import { nfeSerieRotas } from "./controllers/http/nfe-serie/rotas.js";
import { nfseConfiguracaoRotas } from "./controllers/http/nfse-configuracao/rotas.js";
import { nfseEmissaoRotas } from "./controllers/http/nfse-emissao/rotas.js";
import { nfseSerieRotas } from "./controllers/http/nfse-serie/rotas.js";
import { notasFiscaisRotas } from "./controllers/http/nota-fiscal/rotas.js";
import { notificacoesRotas } from "./controllers/http/notificacoes/rotas.js";
import { objetosRotas } from "./controllers/http/objeto/rotas.js";
import { operacoesFiscaisRotas } from "./controllers/http/operacao-fiscal/rotas.js";
import { ordensServicoRotas } from "./controllers/http/ordem-servico/rotas.js";
import { parametrizacaoTributosRotas } from "./controllers/http/parametrizacao-tributos/rotas.js";
import { planoContasRotas } from "./controllers/http/plano-contas/rotas.js";
import { planosContasContaContabilRotas } from "./controllers/http/plano-contas-conta-contabil/rotas.js";
import { planosRotas } from "./controllers/http/planos/rotas.js";
import { produtosRotas } from "./controllers/http/produtos/rotas.js";
import { receitasSemContribuicaoRotas } from "./controllers/http/receita-sem-contribuicao/rotas.js";
import { relatoriosRotas } from "./controllers/http/relatorios/rotas.js";
import { saldosEstoqueRotas } from "./controllers/http/saldo-estoque/rotas.js";
import { servicosNfseRotas } from "./controllers/http/servicos-nfse/rotas.js";
import { sintegraRotas } from "./controllers/http/sintegra/rotas.js";
import { tarefasRotas } from "./controllers/http/tarefas/rotas.js";
import { taxaUfRotas } from "./controllers/http/taxauf/rotas.js";
import { tiposDocumentoFinanceiroRotas } from "./controllers/http/tipo-documento-financeiro/rotas.js";
import { tiposProblemaRotas } from "./controllers/http/tipo-problema/rotas.js";
import { unidadesMedidaRotas } from "./controllers/http/unidade-medida/rotas.js";
import { usuariosRotas } from "./controllers/http/usuarios/rotas.js";
import { vendasPdvGourmetRotas } from "./controllers/http/venda-pdv-gourmet/rotas.js";
import { vendasPdvItemRotas } from "./controllers/http/venda-pdv-item/rotas.js";
import { verificarAcessoGarcom } from "./controllers/middleware/verificar-acesso-garcom.js";
import { verifyJwt } from "./controllers/middleware/verify-jwt.js";
import { getApiBaseUrl } from "./util/base-url.js";
import { isOrigemCorsPermitida } from "./util/cors-origins.js";
import { registrarAgendador } from "./worker/registrar-agendador.js";

export const app = Fastify({ logger: true });

app.register(cors, {
	origin: (origin, cb) => {
		if (isOrigemCorsPermitida(origin)) {
			cb(null, true);
			return;
		}
		cb(new Error("Not allowed by CORS"), false);
	},
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: [
		"Content-Type",
		"Authorization",
		"X-Requested-With",
		"Accept",
		"Origin",
	],
	credentials: true, // Necessário para cookies do Better Auth
	maxAge: 86400,
});

await app.register(swagger, {
	openapi: {
		info: {
			title: "API Mais Gestão",
			description: "API de controle financeiro empresarial",
			version: "1.0.0",
		},
		servers: [
			{
				url: "http://localhost:3333",
				description: "Servidor de desenvolvimento",
			},
			{
				url: getApiBaseUrl(),
				description: "Servidor de desenvolvimento",
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
			},
		},
		tags: [
			{ name: "auth", description: "Operações de autenticação" },
			{ name: "entidades", description: "Operações com entidades" },
			{
				name: "contas-correntes",
				description: "Operações com contas correntes",
			},
			{ name: "empresas", description: "Operações com empresas" },
			{ name: "plano-contas", description: "Operações com plano de contas" },
			{
				name: "financeiro",
				description: "Operações com registros financeiros",
			},
			{
				name: "financeiro-lancamentos",
				description: "Operações com lançamentos financeiros",
			},
			{
				name: "conta-corrente-lancamentos",
				description: "Operações com lançamentos de contas correntes",
			},
			{ name: "bancos", description: "Operações com bancos" },
			{
				name: "configuracoes",
				description: "Operações com configurações da empresa",
			},
			{
				name: "configuracoes-usuario",
				description: "Operações com configurações globais do usuário",
			},
			{
				name: "ia",
				description: "Operações com IA (Atena)",
			},
			{ name: "auditoria", description: "Operações com logs de auditoria" },
			{ name: "dashboard", description: "Operações com dashboard" },
			{
				name: "conta-contabil",
				description: "Operações com contas contábeis",
			},
			{
				name: "contabilidade",
				description: "Operações de contabilidade e exportação fiscal",
			},
			{
				name: "relatorios",
				description: "Operações com relatórios",
			},
			{
				name: "notificacoes",
				description: "Operações com notificações do usuário",
			},
			{ name: "produtos", description: "Operações com produtos" },
			{
				name: "custo-produto",
				description: "Operações com custos de produtos",
			},
			{
				name: "nota-fiscal",
				description: "Operações com notas fiscais de compra",
			},
			{
				name: "fechamentos-caixa",
				description: "Operações com fechamentos de caixa de PDV",
			},
		],
	},
});

await app.register(swaggerUi, {
	routePrefix: "/docs",
	uiConfig: {
		docExpansion: "list",
		deepLinking: false,
	},
	staticCSP: true,
	transformStaticCSP: (header) => header,
});

// Rotas específicas do Better Auth documentadas no Swagger
// Devem ser definidas após o registro do Swagger para aparecerem na documentação
app.route({
	method: "POST",
	url: "/api/auth/sign-in/email",
	schema: {
		tags: ["auth"],
		summary: "Fazer login com email e senha",
		description: "Autentica um usuário usando email e senha",
		body: {
			type: "object",
			required: ["email", "password"],
			properties: {
				email: {
					type: "string",
					format: "email",
					description: "Email do usuário",
				},
				password: {
					type: "string",
					minLength: 8,
					description: "Senha do usuário (mínimo 8 caracteres)",
				},
				rememberMe: {
					type: "boolean",
					description: "Manter sessão após fechar o navegador (padrão: true)",
					default: true,
				},
				callbackURL: {
					type: "string",
					description: "URL para redirecionar após login (opcional)",
				},
			},
		},
		response: {
			200: {
				type: "object",
				description: "Login realizado com sucesso",
				properties: {
					user: {
						type: "object",
						properties: {
							id: { type: "string" },
							name: { type: "string" },
							email: { type: "string" },
							emailVerified: { type: "boolean" },
							image: { type: "string", nullable: true },
							createdAt: { type: "string" },
							updatedAt: { type: "string" },
						},
					},
					session: {
						type: "object",
						properties: {
							id: { type: "string" },
							expiresAt: { type: "string" },
							token: { type: "string" },
							ipAddress: { type: "string", nullable: true },
							userAgent: { type: "string", nullable: true },
						},
					},
				},
			},
			400: {
				type: "object",
				properties: {
					error: { type: "string" },
					message: { type: "string" },
				},
			},
			401: {
				type: "object",
				properties: {
					error: { type: "string" },
					message: { type: "string" },
				},
			},
			403: {
				type: "object",
				properties: {
					error: { type: "string" },
					message: { type: "string" },
				},
			},
		},
	},
	handler: async (request: FastifyRequest, reply: FastifyReply) => {
		await authenticationRoute(request, reply);
	},
});

app.route({
	method: "POST",
	url: "/api/auth/sign-up/email",
	schema: {
		tags: ["auth"],
		summary: "Criar conta com email e senha",
		description: "Registra um novo usuário usando email e senha",
		body: {
			type: "object",
			required: ["email", "password", "name"],
			properties: {
				email: {
					type: "string",
					format: "email",
					description: "Email do usuário",
				},
				password: {
					type: "string",
					minLength: 8,
					description: "Senha do usuário (mínimo 8 caracteres)",
				},
				name: {
					type: "string",
					description: "Nome do usuário",
				},
				image: {
					type: "string",
					description: "URL da imagem de perfil (opcional)",
					nullable: true,
				},
				callbackURL: {
					type: "string",
					description: "URL para redirecionar após cadastro (opcional)",
				},
			},
		},
		response: {
			200: {
				type: "object",
				description: "Conta criada com sucesso",
				properties: {
					user: {
						type: "object",
						properties: {
							id: { type: "string" },
							name: { type: "string" },
							email: { type: "string" },
							emailVerified: { type: "boolean" },
							image: { type: "string", nullable: true },
							createdAt: { type: "string" },
							updatedAt: { type: "string" },
						},
					},
					session: {
						type: "object",
						properties: {
							id: { type: "string" },
							expiresAt: { type: "string" },
							token: { type: "string" },
							ipAddress: { type: "string", nullable: true },
							userAgent: { type: "string", nullable: true },
						},
					},
				},
			},
			400: {
				type: "object",
				properties: {
					error: { type: "string" },
					message: { type: "string" },
				},
			},
			409: {
				type: "object",
				properties: {
					error: { type: "string" },
					message: { type: "string" },
				},
			},
		},
	},
	handler: async (request: FastifyRequest, reply: FastifyReply) => {
		await authenticationRoute(request, reply);
	},
});

// Rota catch-all para outras rotas do Better Auth
// Deve ser definida por último para não interceptar as rotas específicas acima
app.route({
	method: ["GET", "POST", "PUT", "DELETE"],
	url: "/api/auth/*",
	async handler(request: FastifyRequest, reply: FastifyReply) {
		await authenticationRoute(request, reply);
	},
});

app.route({
	method: "GET",
	url: "/api/auth/perfil",
	schema: {
		tags: ["auth"],
		summary: "Obter perfil do usuário autenticado",
		description:
			"Retorna dados do usuário com perfil completo. Aceita cookie de sessão ou Bearer token.",
		security: [{ bearerAuth: [] }],
		response: {
			200: {
				type: "object",
				properties: {
					id: { type: "string" },
					nome: { type: "string" },
					email: { type: "string" },
					perfil: {
						type: "array",
						items: { type: "string" },
					},
					plano: { type: "string", nullable: true },
				},
			},
		},
	},
	preHandler: verifyJwt,
	handler: obterPerfil,
});

app.route({
	method: "GET",
	url: "/api/auth/get-session",
	schema: {
		tags: ["auth"],
		summary: "Obter sessão atual",
		description:
			"Retorna os dados da sessão e do usuário autenticado. Substitui o antigo endpoint /auth/perfil.",
		security: [{ bearerAuth: [] }],
		response: {
			200: {
				type: "object",
				description: "Sessão válida",
				properties: {
					session: {
						type: "object",
						properties: {
							id: { type: "string" },
							userId: { type: "string" },
							expiresAt: { type: "string" },
							token: { type: "string" },
							ipAddress: { type: "string", nullable: true },
							userAgent: { type: "string", nullable: true },
						},
					},
					user: {
						type: "object",
						properties: {
							id: { type: "string" },
							name: { type: "string" },
							email: { type: "string" },
							emailVerified: { type: "boolean" },
							image: { type: "string", nullable: true },
							createdAt: { type: "string" },
							updatedAt: { type: "string" },
							perfil: {
								type: "string",
								description: "Perfil do usuário (adicionado via customSession)",
							},
						},
					},
				},
			},
		},
	},
	async handler(request: FastifyRequest, reply: FastifyReply) {
		await authenticationRoute(request, reply);
	},
});

app.register(healthRotas);
app.register(adminRotas);
app.register(informativosRotas);

app.register(planoContasRotas);
app.register(empresasRotas);
app.register(entidadesRotas);
// app.register(authRotas); // Removido pois usamos rotas nativas do Better Auth
app.register(contaCorrenteRotas);
app.register(contaCorrenteLancamentoRotas);
app.register(financeiroRotas);
app.register(financeiroLancamentoRotas);
app.register(bancosRotas);
app.register(localidadesRotas);
app.register(configuracaoRotas);
app.register(configuracaoUsuarioRotas);
app.register(auditoriaRotas);
app.register(dashboardRotas);
app.register(usuariosRotas);
app.register(assinaturasRotas);
app.register(planosRotas);
app.register(contaContabilRotas);
app.register(iaRotas);
app.register(notificacoesRotas);
app.register(tarefasRotas);
app.register(relatoriosRotas);
app.register(areasRotas);
app.register(centrosCustoRotas);
app.register(cestsRotas);
app.register(cfopsRotas);
app.register(cfopDeParaRotas);
app.register(empresaFiscalRotas);
app.register(certificadoDigitalRotas);
app.register(nfeConfiguracaoRotas);
app.register(nfceConfiguracaoRotas);
app.register(nfceRotas);
app.register(estoqueRotas);
app.register(nfeSerieRotas);
app.register(nfeEmissaoRotas);
app.register(nfseConfiguracaoRotas);
app.register(nfseSerieRotas);
app.register(nfseEmissaoRotas);
app.register(servicosNfseRotas);
app.register(nfeInboundRotas);
app.register(parametrizacaoTributosRotas);
app.register(taxaUfRotas);
app.register(cfopsPadraoRotas);
app.register(condicoesPagamentoRotas);
app.register(departamentosRotas);
app.register(enquadramentosIpiRotas);
app.register(hierarquiasRotas);
app.register(locaisRetiradaRotas);
app.register(locaisEstoqueRotas);
app.register(saldosEstoqueRotas);
app.register(movimentosEstoqueRotas);
app.register(motivosRebaixaRotas);
app.register(receitasSemContribuicaoRotas);
app.register(tiposDocumentoFinanceiroRotas);
app.register(fatoresConversaoRotas);
app.register(unidadesMedidaRotas);
app.register(objetosRotas);
app.register(tiposProblemaRotas);
app.register(ordensServicoRotas);
app.register(operacoesFiscaisRotas);
app.register(davsRotas);
app.register(emailRotas);
app.register(codigosReduzidosContaContabilRotas);
app.register(contabilidadeRotas);
app.register(automacaoRotas);
app.register(sintegraRotas);
app.register(entidadesContaContabilRotas);
app.register(integracoesContabilConfiguracaoRotas);
app.register(planosContasContaContabilRotas);
app.register(produtosRotas);
app.register(custosProdutoRotas);
app.register(notasFiscaisRotas);
app.register(contasMesaRotas);
app.register(contasMesaItemRotas);
app.register(vendasPdvGourmetRotas);
app.register(vendasPdvItemRotas);
app.register(fechamentosCaixaRotas);

app.addHook("preHandler", verificarAcessoGarcom);

app.listen({ port: 3333 }).then(() => {
	console.log("HTTP server running on port 3333");
	console.log(`Swagger documentation available at ${getApiBaseUrl()}/docs`);
	registrarAgendador();
});
