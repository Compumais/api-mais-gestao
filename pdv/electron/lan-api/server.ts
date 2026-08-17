import {
	createServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";
import { getConfig } from "../db/database";
import { lancamentosDeBody } from "../db/pagamento";
import { obterSessao } from "../db/repos";
import { localApi } from "../local-api";
import { listarIpsLan } from "./ips";

const ROTAS_PUBLICAS = new Set(["GET /pos/health", "POST /pos/login"]);

let server: Server | null = null;
let portaAtual = 0;

export function obterPortaLan(): number {
	return portaAtual;
}

export async function startLanServer(): Promise<{
	ok: boolean;
	porta: number;
	ips: string[];
	motivo?: string;
}> {
	const habilitada = (await getConfig("lan_habilitada", "1")) === "1";
	if (!habilitada) {
		await stopLanServer();
		return { ok: false, porta: 0, ips: [], motivo: "LAN desabilitada" };
	}

	const porta = Math.max(
		1,
		Number(await getConfig("lan_porta", "5050")) || 5050,
	);
	if (server && portaAtual === porta) {
		return { ok: true, porta, ips: listarIpsLan() };
	}

	await stopLanServer();

	return new Promise((resolve, reject) => {
		const httpServer = createServer((req, res) => {
			void tratarRequisicao(req, res);
		});
		httpServer.on("error", (err) => {
			server = null;
			portaAtual = 0;
			reject(err);
		});
		httpServer.listen(porta, "0.0.0.0", () => {
			server = httpServer;
			portaAtual = porta;
			console.log(`PDV LAN API em 0.0.0.0:${porta}`);
			resolve({ ok: true, porta, ips: listarIpsLan() });
		});
	});
}

export async function stopLanServer(): Promise<void> {
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

export async function restartLanServer(): Promise<void> {
	await stopLanServer();
	await startLanServer().catch((err) => {
		console.error("Falha ao iniciar API LAN:", err);
	});
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
			res.writeHead(204);
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
	const sessao = await obterSessao();
	return Boolean(sessao.token && sessao.token === token);
}

async function despachar(
	method: string,
	path: string,
	body: Record<string, unknown>,
): Promise<{ status: number; body: unknown } | undefined> {
	if (method === "GET" && path === "/pos/health") {
		return { status: 200, body: await localApi.health() };
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

	const contaFecharMatch = path.match(/^\/pos\/contas\/([^/]+)\/fechar$/);
	if (method === "POST" && contaFecharMatch) {
		const lancamentos = lancamentosDeBody(body);
		return {
			status: 200,
			body: await localApi.fecharContaMesa(
				contaFecharMatch[1],
				lancamentos.length ? lancamentos : meioDeBody(body),
				body.troco != null ? Number(body.troco) : undefined,
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

	return undefined;
}

function itemDeBody(body: Record<string, unknown>): {
	idproduto: string;
	descricao: string;
	quantidade: number;
	precounitario: number;
} {
	return {
		idproduto: String(body.idproduto ?? ""),
		descricao: String(body.descricao ?? ""),
		quantidade: Number(body.quantidade ?? 0),
		precounitario: Number(body.precounitario ?? 0),
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
	if (/abra o caixa/i.test(mensagem) || /nenhum caixa aberto/i.test(mensagem)) {
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
