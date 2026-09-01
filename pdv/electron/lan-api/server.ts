import {
	createServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";
import { sessaoTemGourmet } from "../db/acesso";
import { getAllConfig, getConfig } from "../db/database";
import { lancamentosDeBody } from "../db/pagamento";
import { obterSessao } from "../db/repos";
import { localApi } from "../local-api";
import {
	handshakeTerminal,
	numerosOcupadosPorSecundarios,
	tokenTerminalValido,
} from "../pdv-secundario/registro";
import {
	extrairConfigNegocio,
	normalizarModoPdv,
	parseNumeroPdv,
} from "../pdv-secundario/regras";
import { garantirRegraFirewall } from "./firewall";
import { listarIpsLan } from "./ips";

const ROTAS_PUBLICAS = new Set([
	"GET /pos/health",
	"POST /pos/login",
	"GET /pos/pdv/identidade",
	"GET /pos/pdv/terminais",
	"POST /pos/pdv/handshake",
]);

const CABECALHOS_CORS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
	"Access-Control-Allow-Headers": "Authorization,Content-Type",
} as const;

const RETRY_MS = 5000;

let server: Server | null = null;
let portaAtual = 0;
let ultimoErro: string | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let encerrando = false;

export type StatusLan = {
	habilitada: boolean;
	ouvindo: boolean;
	porta: number;
	ips: string[];
	erro: string | null;
	motivo?: string;
};

export function obterPortaLan(): number {
	return portaAtual;
}

export function statusLanAtual(): StatusLan {
	return {
		habilitada: true,
		ouvindo: server != null && portaAtual > 0,
		porta: portaAtual,
		ips: listarIpsLan(),
		erro: ultimoErro,
	};
}

async function lerConfigLan(): Promise<{
	modo: ReturnType<typeof normalizarModoPdv>;
	habilitada: boolean;
	porta: number;
}> {
	try {
		return {
			modo: normalizarModoPdv(await getConfig("pdv_modo", "principal")),
			habilitada: (await getConfig("lan_habilitada", "1")) === "1",
			porta: Math.max(1, Number(await getConfig("lan_porta", "5050")) || 5050),
		};
	} catch {
		return { modo: "principal", habilitada: true, porta: 5050 };
	}
}

function limparRetry(): void {
	if (retryTimer) {
		clearTimeout(retryTimer);
		retryTimer = null;
	}
}

function agendarRetry(): void {
	if (encerrando || retryTimer) return;
	retryTimer = setTimeout(() => {
		retryTimer = null;
		void startLanServer().catch(() => undefined);
	}, RETRY_MS);
}

function marcarErro(err: unknown): void {
	ultimoErro = err instanceof Error ? err.message : String(err);
}

export async function startLanServer(): Promise<StatusLan> {
	if (encerrando) {
		return { ...statusLanAtual(), habilitada: false, motivo: "encerrando" };
	}

	const config = await lerConfigLan();
	if (config.modo === "secundario") {
		limparRetry();
		await fecharServidor();
		ultimoErro = null;
		return {
			habilitada: false,
			ouvindo: false,
			porta: 0,
			ips: listarIpsLan(),
			erro: null,
			motivo: "PDV secundário não expõe API LAN",
		};
	}

	if (!config.habilitada) {
		limparRetry();
		await fecharServidor();
		ultimoErro = null;
		return {
			habilitada: false,
			ouvindo: false,
			porta: 0,
			ips: listarIpsLan(),
			erro: null,
			motivo: "LAN desabilitada",
		};
	}

	if (server && portaAtual === config.porta) {
		ultimoErro = null;
		return {
			habilitada: true,
			ouvindo: true,
			porta: portaAtual,
			ips: listarIpsLan(),
			erro: null,
		};
	}

	await fecharServidor();

	try {
		const iniciado = await escutar(config.porta);
		ultimoErro = null;
		void garantirRegraFirewall(config.porta);
		console.log(`PDV LAN API em 0.0.0.0:${iniciado.porta}`);
		return {
			habilitada: true,
			ouvindo: true,
			porta: iniciado.porta,
			ips: listarIpsLan(),
			erro: null,
		};
	} catch (err) {
		marcarErro(err);
		console.error("Falha ao iniciar API LAN:", ultimoErro);
		agendarRetry();
		return {
			habilitada: true,
			ouvindo: false,
			porta: 0,
			ips: listarIpsLan(),
			erro: ultimoErro,
			motivo: ultimoErro ?? undefined,
		};
	}
}

function escutar(porta: number): Promise<{ porta: number }> {
	return new Promise((resolve, reject) => {
		const httpServer = createServer((req, res) => {
			void tratarRequisicao(req, res);
		});
		let finalizado = false;

		httpServer.on("error", (err) => {
			if (finalizado) {
				if (server === httpServer) {
					server = null;
					portaAtual = 0;
					marcarErro(err);
					httpServer.close();
					agendarRetry();
				}
				return;
			}
			finalizado = true;
			httpServer.close();
			reject(err);
		});

		httpServer.listen(porta, "0.0.0.0", () => {
			if (finalizado) return;
			finalizado = true;
			server = httpServer;
			portaAtual = porta;
			resolve({ porta });
		});
	});
}

async function fecharServidor(): Promise<void> {
	if (!server) {
		portaAtual = 0;
		return;
	}
	const atual = server;
	server = null;
	portaAtual = 0;
	await new Promise<void>((resolve) => {
		atual.close(() => resolve());
	});
}

export async function stopLanServer(): Promise<void> {
	limparRetry();
	await fecharServidor();
}

export async function encerrarLanServer(): Promise<void> {
	encerrando = true;
	await stopLanServer();
}

export async function restartLanServer(): Promise<StatusLan> {
	encerrando = false;
	limparRetry();
	await fecharServidor();
	return startLanServer();
}

async function tratarRequisicao(
	req: IncomingMessage,
	res: ServerResponse,
): Promise<void> {
	try {
		const url = new URL(req.url ?? "/", "http://localhost");
		const method = (req.method ?? "GET").toUpperCase();
		const path = url.pathname.replace(/\/+$/, "") || "/";
		const chave = `${method} ${path}`;

		if (method === "OPTIONS") {
			res.writeHead(204, CABECALHOS_CORS);
			res.end();
			return;
		}

		if (!ROTAS_PUBLICAS.has(chave) && !(await autorizar(req))) {
			enviarJson(res, 401, { error: "Não autorizado" });
			return;
		}

		const body =
			method === "GET" || method === "HEAD"
				? Object.fromEntries(url.searchParams.entries())
				: await lerJson(req);
		const resultado = await despachar(method, path, body);
		if (resultado === undefined) {
			enviarJson(res, 404, { error: "Rota não encontrada" });
			return;
		}
		enviarJson(res, resultado.status, resultado.body);
	} catch (err) {
		const mensagem = err instanceof Error ? err.message : "Erro interno";
		const status = statusDeErro(err);
		enviarJson(res, status, { error: mensagem });
	}
}

async function autorizar(req: IncomingMessage): Promise<boolean> {
	const header = req.headers.authorization ?? "";
	const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
	if (!token) {
		return false;
	}
	if (await tokenTerminalValido(token)) {
		return true;
	}
	const sessao = await obterSessao();
	return Boolean(sessao.token && sessao.token === token);
}

async function despachar(
	method: string,
	path: string,
	body: Record<string, unknown>,
): Promise<{ status: number; body: unknown } | undefined> {
	if (
		path === "/pos/mesas" ||
		path.startsWith("/pos/mesas/") ||
		path.startsWith("/pos/contas/") ||
		path === "/pos/delivery" ||
		path.startsWith("/pos/delivery/")
	) {
		const sessao = await obterSessao();
		if (!sessaoTemGourmet(sessao.modulogourmet)) {
			return {
				status: 403,
				body: {
					error:
						"O plano desta empresa não inclui o módulo Gourmet. Mesas e comandas ficam indisponíveis.",
				},
			};
		}
	}

	if (method === "GET" && path === "/pos/health") {
		return { status: 200, body: await localApi.health() };
	}

	if (method === "GET" && path === "/pos/pdv/identidade") {
		const numeropdv = parseNumeroPdv(await getConfig("numeropdv", "1")) || 1;
		return {
			status: 200,
			body: {
				app: "pdv-mais-gestao",
				modo: normalizarModoPdv(await getConfig("pdv_modo", "principal")),
				numeropdv,
				lanPorta:
					portaAtual || Number(await getConfig("lan_porta", "5050")) || 5050,
			},
		};
	}

	if (method === "GET" && path === "/pos/pdv/terminais") {
		const modo = normalizarModoPdv(await getConfig("pdv_modo", "principal"));
		if (modo === "secundario") {
			return {
				status: 400,
				body: {
					error:
						"Este endereço é um PDV secundário. Informe o IP do principal.",
				},
			};
		}
		const numeropdvPrincipal =
			parseNumeroPdv(await getConfig("numeropdv", "1")) || 1;
		const terminais = await localApi.listarTerminaisPdv();
		const ocupados = await numerosOcupadosPorSecundarios();
		return {
			status: 200,
			body: {
				numeropdvPrincipal,
				terminais,
				ocupados,
			},
		};
	}

	if (method === "POST" && path === "/pos/pdv/handshake") {
		const numeroPrincipal =
			parseNumeroPdv(await getConfig("numeropdv", "1")) || 1;
		const result = await handshakeTerminal({
			numeropdv: String(body.numeropdv ?? ""),
			identificador: String(body.identificador ?? ""),
			numeroPrincipal,
		});
		return {
			status: 200,
			body: {
				ok: true,
				token: result.token,
				numeropdv: result.numeropdv,
				numeropdvPrincipal: numeroPrincipal,
			},
		};
	}

	if (method === "GET" && path === "/pos/pdv/config-negocio") {
		return {
			status: 200,
			body: { config: extrairConfigNegocio(await getAllConfig()) },
		};
	}

	if (method === "GET" && path === "/pos/pdv/catalogo") {
		return { status: 200, body: await localApi.catalogoCarga() };
	}

	if (method === "POST" && path === "/pos/login") {
		const email = String(body.email ?? "");
		const password = String(body.password ?? "");
		const result = await localApi.login(email, password);
		const sessao = await obterSessao();
		return {
			status: 200,
			body: {
				token: sessao.token,
				userid: sessao.userid,
				username: result.username,
				empresas: result.empresas,
			},
		};
	}

	if (method === "GET" && path === "/pos/status") {
		return { status: 200, body: await localApi.getStatus() };
	}

	if (method === "GET" && path === "/pos/balanca/peso") {
		return { status: 200, body: await localApi["balanca.lerPeso"]() };
	}

	if (method === "GET" && path === "/pos/empresas") {
		return { status: 200, body: { data: await localApi.listarEmpresasLan() } };
	}

	if (method === "POST" && path === "/pos/empresa") {
		const idempresa = String(body.idempresa ?? "");
		const nomeempresa = String(body.nomeempresa ?? "");
		return {
			status: 200,
			body: await localApi.selecionarEmpresa(idempresa, nomeempresa),
		};
	}

	if (method === "GET" && path === "/pos/sync") {
		return { status: 200, body: await localApi.catalogoCarga() };
	}

	if (method === "GET" && path === "/pos/mesas") {
		return { status: 200, body: { data: await localApi.listarMesas() } };
	}

	if (method === "POST" && path === "/pos/mesas/limpar-vazias") {
		const removidas = await localApi.limparContasVazias();
		return { status: 200, body: { removidas } };
	}

	const mesaMatch = path.match(/^\/pos\/mesas\/(\d+)$/);
	if (method === "GET" && mesaMatch) {
		return {
			status: 200,
			body: await localApi.obterMesa(Number(mesaMatch[1])),
		};
	}

	const mesaContaMatch = path.match(/^\/pos\/mesas\/(\d+)\/conta$/);
	if (method === "GET" && mesaContaMatch) {
		return {
			status: 200,
			body: await localApi.obterContaPorNumero(Number(mesaContaMatch[1])),
		};
	}

	const mesaAbrirMatch = path.match(/^\/pos\/mesas\/(\d+)\/abrir$/);
	if (method === "POST" && mesaAbrirMatch) {
		const nome = body.nomecliente ? String(body.nomecliente) : undefined;
		return {
			status: 200,
			body: await localApi.abrirContaMesa(Number(mesaAbrirMatch[1]), nome),
		};
	}

	const mesaItensMatch = path.match(/^\/pos\/mesas\/(\d+)\/itens$/);
	if (method === "POST" && mesaItensMatch) {
		return {
			status: 200,
			body: await localApi.adicionarItemNaMesa(
				Number(mesaItensMatch[1]),
				itemDeBody(body),
				body.nomecliente ? String(body.nomecliente) : undefined,
			),
		};
	}

	const contaMatch = path.match(/^\/pos\/contas\/([^/]+)$/);
	if (method === "GET" && contaMatch) {
		return { status: 200, body: await localApi.obterContaMesa(contaMatch[1]) };
	}

	const contaNomeMatch = path.match(/^\/pos\/contas\/([^/]+)\/nome$/);
	if (method === "PUT" && contaNomeMatch) {
		return {
			status: 200,
			body: await localApi.atualizarNomeClienteConta(
				contaNomeMatch[1],
				String(body.nomecliente ?? ""),
			),
		};
	}

	const contaPedidoMatch = path.match(/^\/pos\/contas\/([^/]+)\/pedido$/);
	if (method === "POST" && contaPedidoMatch) {
		const itensRaw = Array.isArray(body.itens) ? body.itens : [];
		const itens = itensRaw.map((item) => {
			const i = item as Record<string, unknown>;
			return {
				idproduto: String(i.idproduto ?? ""),
				quantidade: Number(i.quantidade ?? 1),
				observacao: i.observacao != null ? String(i.observacao) : null,
				idprodutomeio: i.idprodutomeio != null ? String(i.idprodutomeio) : null,
			};
		});
		return {
			status: 200,
			body: await localApi.enviarPedidoConta(
				contaPedidoMatch[1],
				String(body.clientOrderId ?? ""),
				itens,
				body.observacaoPedido != null
					? String(body.observacaoPedido)
					: body.obsPedido != null
						? String(body.obsPedido)
						: null,
			),
		};
	}

	const contaItensMatch = path.match(/^\/pos\/contas\/([^/]+)\/itens$/);
	if (method === "POST" && contaItensMatch) {
		return {
			status: 200,
			body: await localApi.adicionarItemConta(
				contaItensMatch[1],
				itemDeBody(body),
			),
		};
	}

	const contaItemCancelarMatch = path.match(
		/^\/pos\/contas\/([^/]+)\/itens\/([^/]+)\/cancelar$/,
	);
	if (method === "POST" && contaItemCancelarMatch) {
		return {
			status: 200,
			body: await localApi.cancelarItemConta(
				contaItemCancelarMatch[1],
				contaItemCancelarMatch[2],
				body.senha != null ? String(body.senha) : undefined,
			),
		};
	}

	const contaFecharMatch = path.match(/^\/pos\/contas\/([^/]+)\/fechar$/);
	if (method === "POST" && contaFecharMatch) {
		const lancamentos = lancamentosDeBody(body);
		const cliente =
			body.cliente && typeof body.cliente === "object"
				? (body.cliente as {
						id?: string;
						nome?: string;
						cnpjcpf?: string | null;
					})
				: null;
		return {
			status: 200,
			body: await localApi.fecharContaMesa(
				contaFecharMatch[1],
				lancamentos.length ? lancamentos : meioDeBody(body),
				body.troco != null ? Number(body.troco) : undefined,
				cliente?.id
					? {
							id: String(cliente.id),
							nome: String(cliente.nome ?? ""),
							cnpjcpf: cliente.cnpjcpf != null ? String(cliente.cnpjcpf) : null,
						}
					: null,
			),
		};
	}

	const contaCancelarMatch = path.match(/^\/pos\/contas\/([^/]+)\/cancelar$/);
	if (method === "POST" && contaCancelarMatch) {
		return {
			status: 200,
			body: await localApi.cancelarContaMesa(contaCancelarMatch[1]),
		};
	}

	const contaAjustesMatch = path.match(/^\/pos\/contas\/([^/]+)\/ajustes$/);
	if (method === "POST" && contaAjustesMatch) {
		return {
			status: 200,
			body: await localApi.aplicarAjustesConta(contaAjustesMatch[1], {
				numeropessoas:
					body.numeropessoas != null ? Number(body.numeropessoas) : undefined,
				taxaAtiva: body.taxaAtiva != null ? Boolean(body.taxaAtiva) : undefined,
				desconto: body.desconto != null ? Number(body.desconto) : undefined,
				senha: body.senha != null ? String(body.senha) : undefined,
			}),
		};
	}

	const contaPreMatch = path.match(/^\/pos\/contas\/([^/]+)\/preconta$/);
	if (method === "POST" && contaPreMatch) {
		return {
			status: 200,
			body: await localApi.imprimirPreConta(contaPreMatch[1]),
		};
	}

	const contaPagMatch = path.match(/^\/pos\/contas\/([^/]+)\/pagamento$/);
	if (method === "POST" && contaPagMatch) {
		return {
			status: 200,
			body: await localApi.registrarPagamentoConta(
				contaPagMatch[1],
				lancamentosDeBody(body),
				body.troco != null ? Number(body.troco) : undefined,
			),
		};
	}

	const contaFatiaMatch = path.match(/^\/pos\/contas\/([^/]+)\/fatia$/);
	if (method === "POST" && contaFatiaMatch) {
		const ids = Array.isArray(body.idsItens)
			? body.idsItens.map((id) => String(id))
			: [];
		return {
			status: 200,
			body: await localApi.fecharFatiaItens(
				contaFatiaMatch[1],
				ids,
				lancamentosDeBody(body),
				body.troco != null ? Number(body.troco) : undefined,
			),
		};
	}

	const contaTransMatch = path.match(/^\/pos\/contas\/([^/]+)\/transferir$/);
	if (method === "POST" && contaTransMatch) {
		const ids = Array.isArray(body.idsItens)
			? body.idsItens.map((id) => String(id))
			: [];
		if (ids.length) {
			return {
				status: 200,
				body: await localApi.transferirItens(
					contaTransMatch[1],
					ids,
					Number(body.numeroDestino),
				),
			};
		}
		return {
			status: 200,
			body: await localApi.transferirConta(
				contaTransMatch[1],
				Number(body.numeroDestino),
			),
		};
	}

	const contaJuntarMatch = path.match(/^\/pos\/contas\/([^/]+)\/juntar$/);
	if (method === "POST" && contaJuntarMatch) {
		return {
			status: 200,
			body: await localApi.juntarContas(
				contaJuntarMatch[1],
				Number(body.numeroDestino),
			),
		};
	}

	const contaTaxaMatch = path.match(/^\/pos\/contas\/([^/]+)\/taxa-entrega$/);
	if (method === "POST" && contaTaxaMatch) {
		return {
			status: 200,
			body: await localApi.aplicarTaxaEntrega(
				contaTaxaMatch[1],
				Number(body.valorentrega ?? 0),
			),
		};
	}

	if (method === "POST" && path === "/pos/vendas/rapida") {
		const itensRaw = Array.isArray(body.itens) ? body.itens : [];
		const itens = itensRaw.map((item) => {
			const i = item as Record<string, unknown>;
			return {
				idproduto: String(i.idproduto ?? ""),
				descricao: String(i.descricao ?? ""),
				quantidade: Number(i.quantidade ?? 0),
				precounitario: Number(i.precounitario ?? 0),
				precototal: Number(i.precototal ?? 0),
			};
		});
		const lancamentos = lancamentosDeBody(body);
		return {
			status: 200,
			body: await localApi.criarVendaRapida({
				itens,
				...(lancamentos.length ? { lancamentos } : { meio: meioDeBody(body) }),
				troco: body.troco != null ? Number(body.troco) : undefined,
				valordesconto:
					body.desconto != null ? Number(body.desconto) : undefined,
			}),
		};
	}

	if (method === "GET" && path === "/pos/vendas") {
		return { status: 200, body: await localApi.listarVendas() };
	}

	if (method === "GET" && path === "/pos/pedidos") {
		const pendentes = String(body.pendentes ?? "1") !== "0";
		return {
			status: 200,
			body: { data: await localApi.listarPedidosFila(pendentes) },
		};
	}

	if (method === "POST" && path === "/pos/pedidos/limpar-fila") {
		return { status: 200, body: await localApi.limparFilaPedidos() };
	}

	if (method === "POST" && path === "/pos/pedidos/reimprimir") {
		const clientOrderId = String(body.clientOrderId ?? body.id ?? "");
		return {
			status: 200,
			body: await localApi.reimprimirPedidoProducao(clientOrderId),
		};
	}

	if (method === "GET" && path === "/pos/delivery") {
		const statusFiltro =
			body.status != null ? String(body.status) : undefined;
		return {
			status: 200,
			body: { data: await localApi.listarPedidosEntrega(statusFiltro) },
		};
	}

	if (method === "POST" && path === "/pos/delivery") {
		const modalidadeRaw = String(body.modalidade ?? "delivery");
		const modalidade =
			modalidadeRaw === "retirada" ? "retirada" : "delivery";
		return {
			status: 200,
			body: await localApi.abrirPedidoEntrega({
				modalidade,
				nomecliente:
					body.nomecliente != null ? String(body.nomecliente) : null,
				telefone: body.telefone != null ? String(body.telefone) : null,
				endereco: body.endereco != null ? String(body.endereco) : null,
				bairro: body.bairro != null ? String(body.bairro) : null,
				complemento:
					body.complemento != null ? String(body.complemento) : null,
				referencia:
					body.referencia != null ? String(body.referencia) : null,
				valorentrega:
					body.valorentrega != null ? Number(body.valorentrega) : null,
				idcliente: body.idcliente != null ? String(body.idcliente) : null,
				obs: body.obs != null ? String(body.obs) : null,
			}),
		};
	}

	if (method === "POST" && path === "/pos/delivery/ingest") {
		const contamesa = (body.contamesa ?? body) as Record<string, unknown>;
		const itensRaw = Array.isArray(body.itens) ? body.itens : [];
		const protocol = String(
			body.protocol ??
				contamesa.orderidintegracao ??
				body.orderidintegracao ??
				"",
		);
		const modalidadeRaw = String(
			body.modalidade ??
				(Number(contamesa.retiradanobalcao) === 1 ? "retirada" : "delivery"),
		);
		const itens = itensRaw.map((item) => {
			const i = item as Record<string, unknown>;
			return {
				idproduto: i.idproduto != null ? String(i.idproduto) : null,
				ean: i.ean != null ? String(i.ean) : null,
				codigo: i.codigo != null ? String(i.codigo) : null,
				codigoproduto:
					i.codigoproduto != null ? String(i.codigoproduto) : null,
				nomeproduto: i.nomeproduto != null ? String(i.nomeproduto) : null,
				quantidade: Number(i.quantidade ?? 1),
				precounitario:
					i.precounitario != null ? Number(i.precounitario) : null,
				observacao: i.observacao != null ? String(i.observacao) : null,
			};
		});
		const result = await localApi.ingestPedidoDelivery({
			protocol,
			modalidade: modalidadeRaw === "retirada" ? "retirada" : "delivery",
			nomecliente: String(
				contamesa.nomecliente ?? contamesa.nome ?? body.nomecliente ?? "",
			),
			telefone:
				contamesa.telefone != null
					? String(contamesa.telefone)
					: body.telefone != null
						? String(body.telefone)
						: null,
			endereco:
				contamesa.endereco != null ? String(contamesa.endereco) : null,
			bairro:
				contamesa.enderecobairro != null
					? String(contamesa.enderecobairro)
					: contamesa.bairro != null
						? String(contamesa.bairro)
						: null,
			complemento:
				contamesa.enderecocomplemento != null
					? String(contamesa.enderecocomplemento)
					: contamesa.complemento != null
						? String(contamesa.complemento)
						: null,
			referencia:
				contamesa.enderecoreferencia != null
					? String(contamesa.enderecoreferencia)
					: null,
			documento:
				contamesa.documento != null ? String(contamesa.documento) : null,
			valorentrega:
				contamesa.valorentrega != null
					? Number(contamesa.valorentrega)
					: body.valorentrega != null
						? Number(body.valorentrega)
						: null,
			obs: contamesa.obs != null ? String(contamesa.obs) : null,
			itens,
		});
		return {
			status: 200,
			body: {
				action: result.action,
				idconta: result.conta.id,
				conta: result.conta,
				maisGestaoContaId: result.conta.id,
				maisGestaoAction: result.action,
				protocol,
			},
		};
	}

	const deliveryIdMatch = path.match(/^\/pos\/delivery\/([^/]+)$/);
	if (method === "GET" && deliveryIdMatch) {
		return {
			status: 200,
			body: await localApi.obterContaMesa(deliveryIdMatch[1]),
		};
	}
	if (method === "PATCH" && deliveryIdMatch) {
		return {
			status: 200,
			body: await localApi.atualizarDadosEntrega(deliveryIdMatch[1], {
				nomecliente:
					body.nomecliente != null ? String(body.nomecliente) : undefined,
				telefone: body.telefone != null ? String(body.telefone) : undefined,
				endereco: body.endereco != null ? String(body.endereco) : undefined,
				bairro: body.bairro != null ? String(body.bairro) : undefined,
				complemento:
					body.complemento != null ? String(body.complemento) : undefined,
				referencia:
					body.referencia != null ? String(body.referencia) : undefined,
				obs: body.obs != null ? String(body.obs) : undefined,
			}),
		};
	}

	const deliveryStatusMatch = path.match(
		/^\/pos\/delivery\/([^/]+)\/status$/,
	);
	if (
		(method === "PATCH" || method === "POST") &&
		deliveryStatusMatch
	) {
		const status =
			body.status != null
				? (String(body.status) as
						| "recebido"
						| "producao"
						| "saiu"
						| "entregue")
				: null;
		return {
			status: 200,
			body: await localApi.atualizarStatusEntrega(
				deliveryStatusMatch[1],
				status,
			),
		};
	}

	const pedidoEntregueMatch = path.match(/^\/pos\/pedidos\/([^/]+)\/entregue$/);
	if (method === "POST" && pedidoEntregueMatch) {
		return {
			status: 200,
			body: await localApi.marcarPedidoEntregue(pedidoEntregueMatch[1]),
		};
	}

	const vendaMatch = path.match(/^\/pos\/vendas\/([^/]+)$/);
	if (method === "GET" && vendaMatch) {
		return { status: 200, body: await localApi.obterVenda(vendaMatch[1]) };
	}

	const retransmitirMatch = path.match(
		/^\/pos\/vendas\/([^/]+)\/retransmitir$/,
	);
	if (method === "POST" && retransmitirMatch) {
		return {
			status: 200,
			body: await localApi.retransmitirNfce(retransmitirMatch[1]),
		};
	}

	const inutilizarMatch = path.match(/^\/pos\/vendas\/([^/]+)\/inutilizar$/);
	if (method === "POST" && inutilizarMatch) {
		return {
			status: 200,
			body: await localApi.inutilizarNfce(
				inutilizarMatch[1],
				String(body.justificativa ?? ""),
			),
		};
	}

	return undefined;
}

function itemDeBody(body: Record<string, unknown>): {
	idproduto: string;
	descricao: string;
	quantidade: number;
	precounitario: number;
	observacao?: string | null;
} {
	return {
		idproduto: String(body.idproduto ?? ""),
		descricao: String(body.descricao ?? ""),
		quantidade: Number(body.quantidade ?? 0),
		precounitario: Number(body.precounitario ?? 0),
		observacao: body.observacao != null ? String(body.observacao) : null,
	};
}

function meioDeBody(
	body: Record<string, unknown>,
): "DINHEIRO" | "PIX" | "CARTAO" {
	const meio = String(body.meio ?? "DINHEIRO").toUpperCase();
	if (meio === "PIX" || meio === "CARTAO") {
		return meio;
	}
	return "DINHEIRO";
}

function statusDeErro(err: unknown): number {
	const mensagem = err instanceof Error ? err.message : "";
	if (
		/abra o caixa/i.test(mensagem) ||
		/nenhum caixa aberto/i.test(mensagem) ||
		(err instanceof Error && err.name === "NumeroPdvDuplicadoError") ||
		/já existe um PDV|é o do PDV principal/i.test(mensagem)
	) {
		return 409;
	}
	if (/não autoriz|sessão/i.test(mensagem)) {
		return 401;
	}
	if (/não encontrad/i.test(mensagem)) {
		return 404;
	}
	return 400;
}

function enviarJson(res: ServerResponse, status: number, body: unknown): void {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		"Content-Length": Buffer.byteLength(payload),
		...CABECALHOS_CORS,
	});
	res.end(payload);
}

async function lerJson(req: IncomingMessage): Promise<Record<string, unknown>> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	if (!chunks.length) {
		return {};
	}
	const raw = Buffer.concat(chunks).toString("utf8").trim();
	if (!raw) {
		return {};
	}
	const parsed: unknown = JSON.parse(raw);
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		return {};
	}
	return parsed as Record<string, unknown>;
}
