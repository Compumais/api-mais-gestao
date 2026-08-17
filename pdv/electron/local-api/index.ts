import {
	ApiError,
	apiBaseUrl,
	baixaEstoqueVenda,
	criarItemVendaPdv,
	criarVendaPdv,
	extrairNfceDaBaixa,
	listarEmpresas,
	loginEmail,
	obterMeuPlano,
	obterPerfilUsuario,
	pingApi,
	substituirAtalhosRemotos,
} from "../api/client";
import {
	CHAVES_CONFIG_GOURMET,
	CHAVES_CONFIG_OPERADOR,
	CHAVES_CONFIG_PRE_LOGIN,
	normalizarPerfis,
	payloadSoTemChaves,
	planoTemGourmet,
	podeConfigurarPdv,
	sessaoTemGourmet,
} from "../db/acesso";
import {
	DATABASE_URL_PADRAO,
	getAllConfig,
	getConfig,
	isBancoIndisponivelError,
	isDbReady,
	obterDatabaseUrl,
	reconectarDb,
	salvarDatabaseUrlArquivo,
} from "../db/database";
import {
	ehMeioPagamento,
	lancamentoUnico,
	totaisParaSync,
} from "../db/pagamento";
import {
	abrirCaixa,
	abrirContaMesa,
	adicionarItemConta,
	adicionarItemNaMesa,
	aplicarAjustesConta,
	atualizarNomeClienteConta,
	atualizarVendaSync,
	buscarProdutoPorCodigo,
	buscarProdutoPorEan,
	buscarProdutosLocal,
	caixaAberto,
	concluirOutboxCriarVendaLocal,
	contarOutboxPendentes,
	criarVendaRapida,
	enfileirarOutbox,
	enviarPedidoConta,
	fecharCaixa,
	fecharContaMesa,
	fecharFatiaItens,
	type ItemCarrinho,
	juntarContas,
	type LancamentoPagamento,
	limparContasVazias,
	limparFilaPedidos,
	limparSessao,
	listarAtalhos,
	listarCatalogoCarga,
	listarGruposGourmetLocal,
	listarGruposLocal,
	listarLancamentosVenda,
	listarMapeamentoImpressorasGourmet,
	listarMesas,
	listarPedidosFila,
	listarPizzasLocal,
	listarProdutosPorGrupo,
	listarProdutosPorGrupoGourmet,
	listarVendas,
	type MeioPagamento,
	marcarPedidoEntregue,
	obterContaMesa,
	obterContaPorNumero,
	obterMesa,
	obterNfcePorVenda,
	obterNumeracaoNfce,
	obterSessao,
	obterVenda,
	salvarAtalhos as persistirAtalhosLocal,
	registrarPagamentoConta,
	type SessaoLocal,
	salvarConfiguracoes,
	salvarMapeamentoImpressorasGourmet,
	salvarSessao,
	senhaGerencialDefinida,
	transferirConta,
	transferirItens,
	validarSenhaGerencial,
} from "../db/repos";
import { emitirOuContingencia } from "../fiscal/contingencia";
import {
	imprimirCupomNaoFiscal,
	imprimirDanfce,
	imprimirPreConta,
	listarImpressoras,
	testarImpressora,
} from "../impressora/escpos";
import {
	imprimirProducaoPedido,
	rotuloOrigemMesa,
} from "../impressora/producao";
import {
	configEtiquetaDeMapa,
	montarLancamentoEtiqueta,
	parsearEtiquetaBalanca,
} from "../integracao/balanca/etiqueta";
import {
	lerPesoBalanca,
	listarPortasBalanca,
	resetarConexaoBalanca,
	statusBalanca,
	testarBalanca,
} from "../integracao/balanca/servico";
import {
	sitefCancelar,
	sitefPagar,
	statusSitef,
} from "../integracao/sitef/servico";
import {
	reiniciarTecnibra,
	statusTecnibra,
	syncTecnibra,
} from "../integracao/tecnibra/servico";
import { assertNumeroPrincipalLivre } from "../pdv-secundario/registro";
import { normalizarModoPdv, parseNumeroPdv } from "../pdv-secundario/regras";
import {
	ehSecundario,
	garantirOperacaoSecundario,
	puxarDoPrincipal,
	statusPrincipalCache,
	testarConexaoPrincipal,
	validarIdentidadeAoSalvar,
} from "../pdv-secundario/servico";
import {
	processarOutbox,
	pullCatalogo,
	sincronizarFiscalPdv as puxarFiscalRetaguarda,
	statusConexao,
} from "../sync/outbox";

export type {
	LancamentoPagamento,
	MeioPagamento,
	StatusLancamentoPagamento,
} from "../db/pagamento";

function avisarTecnibra(): void {
	void syncTecnibra();
}

async function sincronizarRolesSessao(
	sessao: SessaoLocal,
): Promise<SessaoLocal> {
	if (!sessao.token) return sessao;
	try {
		const perfil = await obterPerfilUsuario();
		return await salvarSessao({
			roles: JSON.stringify(normalizarPerfis(perfil.perfil)),
		});
	} catch {
		return sessao;
	}
}

async function sincronizarModuloGourmet(
	sessao: SessaoLocal,
): Promise<SessaoLocal> {
	if (!sessao.token || !sessao.idempresa) return sessao;
	try {
		const plano = await obterMeuPlano(sessao.idempresa);
		return await salvarSessao({
			modulogourmet: planoTemGourmet(plano.modulos) ? "1" : "0",
		});
	} catch {
		return sessao;
	}
}

const ERRO_SEM_GOURMET =
	"O plano desta empresa não inclui o módulo Gourmet. Mesas e comandas ficam indisponíveis.";

async function assertModuloGourmet(): Promise<void> {
	const sessao = await obterSessao();
	if (!sessaoTemGourmet(sessao.modulogourmet)) {
		throw new Error(ERRO_SEM_GOURMET);
	}
}

async function assertPodeSalvarConfig(
	dados: Record<string, string>,
): Promise<void> {
	let sessao: SessaoLocal | null = null;
	try {
		sessao = await obterSessao();
	} catch {
		sessao = null;
	}
	if (podeConfigurarPdv(sessao?.roles)) return;
	const logado = Boolean(sessao?.token);
	if (!logado) {
		if (!payloadSoTemChaves(dados, CHAVES_CONFIG_PRE_LOGIN)) {
			throw new Error(
				"Faça login como administrador ou proprietário para alterar as configurações.",
			);
		}
		return;
	}
	if (!payloadSoTemChaves(dados, CHAVES_CONFIG_OPERADOR)) {
		throw new Error(
			"Somente administrador ou proprietário pode alterar as configurações.",
		);
	}
}

async function emitirNfceOnlineDaVenda(vendaId: string): Promise<{
	ok: boolean;
	chave?: string;
	qrCode?: string;
	protocolo?: string;
	idnotafiscal?: string;
	cStat?: string;
	erro?: string;
	indisponivel?: boolean;
	xml?: string;
	serie?: string;
	numero?: number;
}> {
	const online = await pingApi();
	if (!online) {
		return { ok: false, indisponivel: true, erro: "API offline" };
	}

	const venda = await obterVenda(vendaId);
	if (!venda) {
		return { ok: false, erro: "Venda não encontrada" };
	}

	try {
		const sessao = await obterSessao();
		if (!sessao.idempresa || !sessao.userid) {
			return { ok: false, erro: "Sessão inválida" };
		}
		const pagamentos =
			venda.pagamentos.length > 0
				? venda.pagamentos
				: await listarLancamentosVenda(venda.id);
		const sync = totaisParaSync(pagamentos, venda.valortroco);
		let idremoto = venda.idremoto;
		if (!idremoto) {
			const criada = await criarVendaPdv({
				idempresa: sessao.idempresa,
				numeropdv: Number(await getConfig("numeropdv", "1")),
				usuarioquefechouvenda: sessao.userid,
				vendalocal: 2,
				valortotal: venda.valortotal,
				valortroco: sync.valortroco,
				valordinheiro: sync.valordinheiro,
				valorpix: sync.valorpix,
				valorcartaocredito: sync.valorcartaocredito,
				valorcartaodebito: sync.valorcartaodebito,
				valorcartao: sync.valorcartao,
				valorprepago: sync.valorprepago,
				pagamentos,
			});
			idremoto = criada.id;

			for (const item of venda.itens) {
				await criarItemVendaPdv({
					idempresa: sessao.idempresa,
					idvenda: idremoto,
					idproduto: item.idproduto,
					quantidade: item.quantidade,
					precounitario: item.precounitario,
					precototal: item.precototal,
					precopromocao: 0,
					precoalterado: 0,
					descricao: item.descricao,
				});
			}

			await atualizarVendaSync(vendaId, {
				idremoto,
				sync_status: "sincronizado",
			});
			await concluirOutboxCriarVendaLocal(vendaId);
		}

		const baixa = await baixaEstoqueVenda({
			idempresa: sessao.idempresa,
			idvenda: idremoto,
			itens: venda.itens.map((i) => ({
				idproduto: i.idproduto,
				quantidade: i.quantidade,
				precounitario: i.precounitario,
				nomeproduto: i.descricao,
			})),
			pagamentos: {
				valortotal: venda.valortotal,
				valortroco: sync.valortroco,
				valordinheiro: sync.valordinheiro,
				valorpix: sync.valorpix,
				valorcartaocredito: sync.valorcartaocredito,
				valorcartaodebito: sync.valorcartaodebito,
				valorcartao: sync.valorcartao,
				valorprepago: sync.valorprepago,
			},
		});
		const nfce = extrairNfceDaBaixa(baixa);
		if (nfce.emitida) {
			const { persistirNfceOnlineLocal } = await import(
				"../fiscal/persistir-nfce-online"
			);
			await persistirNfceOnlineLocal({
				idvenda: vendaId,
				idnotafiscal: nfce.idnotafiscal,
				chave: nfce.chave,
				qrCode: nfce.qrCode,
				protocolo: nfce.protocolo,
				xml: nfce.xml,
				serie: nfce.serie,
				numero: nfce.numero,
			});
		}
		return {
			ok: nfce.emitida,
			chave: nfce.chave,
			qrCode: nfce.qrCode,
			protocolo: nfce.protocolo,
			idnotafiscal: nfce.idnotafiscal,
			cStat: nfce.cStat,
			erro: nfce.erro,
			indisponivel: !nfce.emitida && !nfce.erro,
			xml: nfce.xml,
			serie: nfce.serie,
			numero: nfce.numero,
		};
	} catch (err) {
		const indisponivel =
			err instanceof ApiError &&
			(err.status === 0 || err.status === 408 || (err.status ?? 0) >= 500);
		return {
			ok: false,
			indisponivel,
			erro: err instanceof Error ? err.message : "Falha emissão",
		};
	}
}

/**
 * Fachada local-api: usada pela UI via IPC e exposta na LAN para o POS Android.
 */
export const localApi = {
	async health() {
		return { ok: true, app: "pdv-mais-gestao", version: "0.1.0" };
	},

	async getStatus() {
		const conexao = await statusConexao();
		let sessao = await obterSessao();
		if (sessao.token && sessao.roles == null && conexao.online) {
			sessao = await sincronizarRolesSessao(sessao);
		}
		if (
			sessao.token &&
			sessao.idempresa &&
			sessao.modulogourmet == null &&
			conexao.online
		) {
			sessao = await sincronizarModuloGourmet(sessao);
		}
		const caixa = await caixaAberto();
		const modo = normalizarModoPdv(await getConfig("pdv_modo", "principal"));
		const principal = modo === "secundario" ? statusPrincipalCache() : null;
		return {
			...conexao,
			podeConfigurar: podeConfigurarPdv(sessao.roles),
			moduloGourmet: sessaoTemGourmet(sessao.modulogourmet),
			sessao: {
				logado: Boolean(sessao.token),
				username: sessao.username,
				idempresa: sessao.idempresa,
				nomeempresa: sessao.nomeempresa,
			},
			caixa,
			emitirNfce: (await getConfig("emitir_nfce", "1")) === "1",
			modeloAtendimento:
				(await getConfig("modelo_atendimento", "mesa")) === "comanda"
					? "comanda"
					: "mesa",
			qtdMesas: Math.max(1, Number(await getConfig("qtd_mesas", "20")) || 20),
			numeropdv: Math.max(1, Number(await getConfig("numeropdv", "1")) || 1),
			modo,
			principalOnline: principal ? principal.online : null,
			principalErro: principal?.erro ?? null,
			balancaHabilitada: (await getConfig("balanca_habilitada", "0")) === "1",
		};
	},

	async login(email: string, password: string) {
		const url = await apiBaseUrl();
		try {
			const result = await loginEmail(email, password);
			await salvarSessao({
				token: result.token,
				userid: result.userid,
				username: result.username,
				roles: null,
			});
			await sincronizarRolesSessao(await obterSessao());
			const empresas = await listarEmpresas(result.userid);
			return { username: result.username, empresas };
		} catch (err) {
			if (err instanceof ApiError && (err.status === 0 || err.status === 408)) {
				throw new Error(
					`Não foi possível conectar em ${url}. Verifique a URL e se a API está no ar.`,
				);
			}
			if (err instanceof ApiError) {
				throw new Error(`${err.message} (${url})`);
			}
			throw err instanceof Error ? err : new Error(`Falha no login (${url})`);
		}
	},

	async selecionarEmpresa(idempresa: string, nomeempresa: string) {
		await salvarSessao({ idempresa, nomeempresa, modulogourmet: null });
		await sincronizarModuloGourmet(await obterSessao());
		const pull = (await ehSecundario())
			? await puxarDoPrincipal().catch(() => ({
					produtos: 0,
					atalhos: 0,
					grupos: 0,
					gruposGourmet: 0,
				}))
			: await pullCatalogo().catch(() => ({
					produtos: 0,
					atalhos: 0,
					grupos: 0,
					gruposGourmet: 0,
				}));
		void processarOutbox();
		return { ok: true, pull };
	},

	async logout() {
		await limparSessao();
		return { ok: true };
	},

	async getConfig() {
		const database_url = obterDatabaseUrl();
		try {
			const config = await getAllConfig();
			const definida = Boolean(config.senha_gerencial_hash);
			delete config.senha_gerencial_hash;
			delete config.senha_gerencial_salt;
			return {
				...config,
				database_url,
				senha_gerencial: "",
				senha_gerencial_definida: definida ? "1" : "0",
			};
		} catch (err) {
			if (isBancoIndisponivelError(err)) {
				return { database_url };
			}
			throw err;
		}
	},

	async saveConfig(dados: Record<string, string>) {
		const payload = { ...dados };
		let sessao: SessaoLocal | null = null;
		try {
			sessao = await obterSessao();
		} catch {
			sessao = null;
		}
		if (!sessaoTemGourmet(sessao?.modulogourmet)) {
			for (const chave of CHAVES_CONFIG_GOURMET) {
				delete payload[chave];
			}
		}
		await assertPodeSalvarConfig(payload);
		const { database_url, ...resto } = payload;
		if (database_url !== undefined) {
			const atual = obterDatabaseUrl();
			const url = database_url.trim() || DATABASE_URL_PADRAO;
			salvarDatabaseUrlArquivo(url);
			if (url !== atual || !isDbReady()) {
				await reconectarDb();
			}
		}
		if (resto.senha_gerencial !== undefined) {
			const senha = resto.senha_gerencial.trim();
			delete resto.senha_gerencial;
			delete resto.senha_gerencial_definida;
			if (senha) {
				const { hashSenhaGerencial } = await import("../db/senha-gerencial");
				const { salt, hash } = hashSenhaGerencial(senha);
				resto.senha_gerencial_salt = salt;
				resto.senha_gerencial_hash = hash;
			}
		}
		if (Object.keys(resto).length) {
			await validarIdentidadeAoSalvar(resto);
			const modo = normalizarModoPdv(
				resto.pdv_modo ?? (await getConfig("pdv_modo", "principal")),
			);
			if (modo === "principal" && resto.numeropdv !== undefined) {
				const numero = parseNumeroPdv(resto.numeropdv);
				if (numero) {
					await assertNumeroPrincipalLivre(numero);
				}
			}
		}
		const saved = Object.keys(resto).length
			? await salvarConfiguracoes(resto)
			: {};
		if (
			resto.lan_habilitada !== undefined ||
			resto.lan_porta !== undefined ||
			resto.pdv_modo !== undefined
		) {
			const { restartLanServer } = await import("../lan-api/server");
			await restartLanServer();
		}
		if (await ehSecundario()) {
			await puxarDoPrincipal().catch(() => undefined);
		}
		if (
			resto.tecnibra_habilitada !== undefined ||
			resto.tecnibra_xml_path !== undefined ||
			resto.tecnibra_intervalo_ms !== undefined ||
			resto.tecnibra_xml_root !== undefined ||
			resto.tecnibra_xml_item !== undefined
		) {
			await reiniciarTecnibra();
		}
		if (
			resto.sitef_habilitado !== undefined ||
			resto.sitef_ip !== undefined ||
			resto.sitef_loja !== undefined ||
			resto.sitef_terminal !== undefined ||
			resto.sitef_parametros !== undefined ||
			resto.sitef_porta_pinpad !== undefined ||
			resto.sitef_dll_path !== undefined
		) {
			const { resetarDllCarregada } = await import("../integracao/sitef/dll");
			const { resetarConfiguracaoSitef } = await import(
				"../integracao/sitef/servico"
			);
			resetarDllCarregada();
			resetarConfiguracaoSitef();
		}
		if (
			resto.balanca_habilitada !== undefined ||
			resto.balanca_porta !== undefined ||
			resto.balanca_baud !== undefined ||
			resto.balanca_protocolo !== undefined
		) {
			await resetarConexaoBalanca();
		}
		return { ...saved, database_url: obterDatabaseUrl() };
	},

	async statusTecnibra() {
		return statusTecnibra();
	},

	async "sitef.status"() {
		return statusSitef();
	},

	async "sitef.pagar"(params: {
		valor: number;
		cupom?: string;
		operador?: string;
	}) {
		return sitefPagar(params);
	},

	async "sitef.cancelar"(params: {
		nsu?: string | null;
		valor?: number;
		cupom?: string;
		operador?: string;
	}) {
		return sitefCancelar(params);
	},

	async "balanca.status"() {
		return statusBalanca();
	},

	async "balanca.lerPeso"() {
		return lerPesoBalanca();
	},

	async "balanca.listarPortas"() {
		return listarPortasBalanca();
	},

	async "balanca.testar"() {
		return testarBalanca();
	},

	async listarEmpresasLan() {
		const sessao = await obterSessao();
		if (!sessao.token || !sessao.userid) {
			throw new Error("Sessão inválida");
		}
		return listarEmpresas(sessao.userid);
	},

	async catalogoCarga() {
		return listarCatalogoCarga();
	},

	async statusLan() {
		const { statusLanAtual } = await import("../lan-api/server");
		const atual = statusLanAtual();
		let habilitada = atual.habilitada;
		let portaConfigurada = 5050;
		try {
			habilitada = (await getConfig("lan_habilitada", "1")) === "1";
			portaConfigurada = Number(await getConfig("lan_porta", "5050")) || 5050;
		} catch {
			// banco ainda indisponível — usa o que o servidor já sabe
		}
		return {
			habilitada,
			ouvindo: atual.ouvindo,
			porta: atual.porta,
			portaConfigurada,
			ips: atual.ips,
			erro: atual.erro,
			motivo: atual.motivo,
		};
	},

	async reiniciarLan() {
		const { restartLanServer } = await import("../lan-api/server");
		return restartLanServer();
	},

	async listarImpressoras() {
		return listarImpressoras();
	},

	async testarImpressora(destino: {
		tipo: "sistema" | "rede" | "arquivo";
		nome?: string;
		host?: string;
		porta?: number;
	}) {
		return testarImpressora(destino);
	},

	async abrirCaixa(valorabertura: number) {
		return abrirCaixa(valorabertura);
	},

	async fecharCaixa(valorfechamento: number) {
		await fecharCaixa(valorfechamento);
		return { ok: true };
	},

	async buscarProdutos(termo?: string) {
		return buscarProdutosLocal(termo ?? "", 80);
	},

	async listarAtalhos() {
		return listarAtalhos();
	},

	async salvarAtalhos(ids: string[]) {
		if (await ehSecundario()) {
			throw new Error(
				"No PDV secundário os atalhos vêm do principal. Configure no PDV principal e use Carga local.",
			);
		}
		const unicos = [...new Set(ids.filter(Boolean))];
		await persistirAtalhosLocal(unicos);
		const sessao = await obterSessao();
		if (!sessao.token || !sessao.idempresa) {
			return {
				ok: true as const,
				quantidade: unicos.length,
				nuvem: false,
			};
		}
		try {
			await substituirAtalhosRemotos(sessao.idempresa, unicos);
			return {
				ok: true as const,
				quantidade: unicos.length,
				nuvem: true,
			};
		} catch {
			await enfileirarOutbox("atalhos_pdv", {
				idempresa: sessao.idempresa,
				idsProdutos: unicos,
			});
			return {
				ok: true as const,
				quantidade: unicos.length,
				nuvem: false,
			};
		}
	},

	async listarGrupos() {
		return listarGruposLocal();
	},

	async listarProdutosPorGrupo(idgrupo: string, termo?: string) {
		return listarProdutosPorGrupo(idgrupo, termo ?? "", 200);
	},

	async listarGruposGourmet() {
		return listarGruposGourmetLocal();
	},

	async listarProdutosPorGrupoGourmet(idgrupogourmet: string, termo?: string) {
		return listarProdutosPorGrupoGourmet(idgrupogourmet, termo ?? "", 200);
	},

	async listarPizzas(excetoId?: string) {
		return listarPizzasLocal(excetoId ?? "", 200);
	},

	async listarMapeamentoImpressorasGourmet() {
		return listarMapeamentoImpressorasGourmet();
	},

	async salvarMapeamentoImpressorasGourmet(
		itens: Array<{
			idgrupogourmet: string;
			destino?: string;
			impressora_nome?: string;
			host?: string;
			porta?: number;
		}>,
	) {
		await salvarMapeamentoImpressorasGourmet(itens);
		return { ok: true };
	},

	async buscarProdutoPorEan(ean: string) {
		return buscarProdutoPorEan(ean);
	},

	async buscarLeituraCodigoBarras(codigo: string) {
		const lido = codigo.trim();
		if (!lido) return null;
		const cfg = configEtiquetaDeMapa(await getAllConfig());
		const parse = parsearEtiquetaBalanca(lido, cfg);
		if (parse) {
			const produto = await buscarProdutoPorCodigo(parse.codigo);
			if (produto) {
				const lancamento = montarLancamentoEtiqueta(produto, parse, cfg);
				return {
					produto,
					...lancamento,
					origem: "etiqueta-balanca" as const,
				};
			}
		}
		const porEan = await buscarProdutoPorEan(lido);
		if (porEan) {
			return {
				produto: porEan,
				quantidade: 1,
				precounitario: porEan.preco,
				precototal: porEan.preco,
				pesado: false,
				origem: "ean" as const,
			};
		}
		const plu = Number(lido.replace(/\D/g, ""));
		if (Number.isInteger(plu) && plu > 0) {
			const porCodigo = await buscarProdutoPorCodigo(plu);
			if (porCodigo) {
				return {
					produto: porCodigo,
					quantidade: 1,
					precounitario: porCodigo.preco,
					precototal: porCodigo.preco,
					pesado: false,
					origem: "ean" as const,
				};
			}
		}
		return null;
	},

	async syncAgora() {
		const pull = (await ehSecundario())
			? await puxarDoPrincipal()
			: await pullCatalogo();
		const outbox = await processarOutbox();
		return { pull, outbox, pendentes: await contarOutboxPendentes() };
	},

	async sincronizarFiscalPdv() {
		if (await ehSecundario()) {
			throw new Error("Sincronize o certificado no PDV principal.");
		}
		const resultado = await puxarFiscalRetaguarda();
		if (!resultado.ok) {
			throw new Error(resultado.erro ?? "Falha ao buscar dados fiscais");
		}
		return resultado;
	},

	async statusFiscalPdv() {
		const numeracao = await obterNumeracaoNfce().catch(() => null);
		return {
			apelido: await getConfig("certificado_apelido", ""),
			validade: await getConfig("certificado_validade", ""),
			serie: numeracao?.serie ?? null,
			proximoNumero: numeracao?.proximo_numero ?? null,
			ultimaSync: await getConfig("fiscal_ultima_sync", ""),
			erro: await getConfig("fiscal_sync_erro", ""),
			caminho: await getConfig("certificado_path", ""),
		};
	},

	async cargaLocal() {
		const sessao = await obterSessao();
		if (!sessao.token || !sessao.idempresa) {
			throw new Error(
				"Faça login e selecione a empresa antes de carregar o catálogo.",
			);
		}
		const secundario = await ehSecundario();
		const pull = secundario ? await puxarDoPrincipal() : await pullCatalogo();
		return {
			ok: true as const,
			origem: secundario ? ("principal" as const) : ("nuvem" as const),
			produtos: pull.produtos,
			grupos: pull.grupos,
			gruposGourmet: pull.gruposGourmet,
			atalhos: pull.atalhos,
		};
	},

	async testarPrincipal(params: {
		host: string;
		porta: string;
		numeropdv: string;
	}) {
		return testarConexaoPrincipal(params);
	},

	async conectarPrincipal() {
		const { conectarNoPrincipal } = await import("../pdv-secundario/servico");
		return conectarNoPrincipal();
	},

	async criarVendaRapida(input: {
		itens: ItemCarrinho[];
		lancamentos?: LancamentoPagamento[];
		meio?: MeioPagamento;
		troco?: number;
	}) {
		const total = input.itens.reduce((acc, item) => acc + item.precototal, 0);
		const lancamentos = input.lancamentos?.length
			? input.lancamentos
			: [lancamentoUnico(input.meio ?? "DINHEIRO", total)];
		await garantirOperacaoSecundario();
		const venda = await criarVendaRapida({
			itens: input.itens,
			lancamentos,
			troco: input.troco,
		});
		const emitir = (await getConfig("emitir_nfce", "1")) === "1";

		let fiscal: {
			modo: "online" | "contingencia" | "nao_fiscal" | "erro";
			mensagem: string;
			chave?: string;
			qrcode?: string;
			cStat?: string;
		} = {
			modo: "nao_fiscal",
			mensagem: "Cupom não fiscal",
		};

		if (emitir) {
			fiscal = await emitirOuContingencia({
				idvenda: venda.id,
				onlineEmitir: () => emitirNfceOnlineDaVenda(venda.id),
			});
		} else {
			await imprimirCupomNaoFiscal(venda.id);
		}

		void imprimirProducaoPedido({
			origem: "Balcão",
			itens: input.itens,
		});

		void processarOutbox();
		return { venda, fiscal };
	},

	async listarVendas() {
		return listarVendas(200);
	},

	async obterVenda(id: string) {
		return obterVenda(id);
	},

	async listarMesas() {
		await assertModuloGourmet();
		return listarMesas();
	},

	async obterMesa(numero: number) {
		await assertModuloGourmet();
		return obterMesa(numero);
	},

	async obterContaPorNumero(numero: number) {
		await assertModuloGourmet();
		return obterContaPorNumero(numero);
	},

	async limparContasVazias() {
		await assertModuloGourmet();
		const removidas = await limparContasVazias();
		avisarTecnibra();
		return removidas;
	},

	async abrirContaMesa(numero: number, nomecliente?: string) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		const conta = await abrirContaMesa(numero, nomecliente);
		avisarTecnibra();
		return conta;
	},

	async obterContaMesa(id: string) {
		await assertModuloGourmet();
		return obterContaMesa(id);
	},

	async adicionarItemConta(
		idconta: string,
		item: {
			idproduto: string;
			descricao: string;
			quantidade: number;
			precounitario: number;
		},
	) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		const conta = await adicionarItemConta(idconta, item);
		avisarTecnibra();
		return conta;
	},

	async atualizarNomeClienteConta(idconta: string, nomecliente: string) {
		await assertModuloGourmet();
		return atualizarNomeClienteConta(idconta, nomecliente);
	},

	async enviarPedidoConta(
		idconta: string,
		clientOrderId: string,
		itens: Array<{
			idproduto: string;
			quantidade: number;
			observacao?: string | null;
			idprodutomeio?: string | null;
		}>,
	) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		const conta = await enviarPedidoConta({ idconta, clientOrderId, itens });
		if (conta.pedidoNovo) {
			try {
				void imprimirProducaoPedido({
					origem: await rotuloOrigemMesa(conta.numero_mesa),
					cliente: conta.nomecliente,
					itens: conta.itensProducao,
				});
			} catch {
				// produção não falha o pedido
			}
		}
		avisarTecnibra();
		return conta;
	},

	async listarPedidosFila(pendentes: boolean) {
		return listarPedidosFila(pendentes);
	},

	async marcarPedidoEntregue(id: string) {
		await marcarPedidoEntregue(id);
		return { ok: true };
	},

	async limparFilaPedidos() {
		await limparFilaPedidos();
		return { ok: true };
	},

	async adicionarItemNaMesa(
		numero: number,
		item: {
			idproduto: string;
			descricao: string;
			quantidade: number;
			precounitario: number;
		},
		nomecliente?: string,
	) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		const conta = await adicionarItemNaMesa(numero, item, nomecliente);
		try {
			void imprimirProducaoPedido({
				origem: await rotuloOrigemMesa(conta.numero_mesa),
				cliente: conta.nomecliente,
				itens: [
					{
						idproduto: item.idproduto,
						descricao: item.descricao,
						quantidade: item.quantidade,
					},
				],
			});
		} catch {
			// produção não falha o pedido
		}
		avisarTecnibra();
		return conta;
	},

	async fecharContaMesa(
		idconta: string,
		lancamentosOuMeio: LancamentoPagamento[] | MeioPagamento,
		troco?: number,
	) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		let lancamentos: LancamentoPagamento[];
		if (typeof lancamentosOuMeio === "string") {
			if (!ehMeioPagamento(lancamentosOuMeio)) {
				throw new Error("Meio de pagamento inválido");
			}
			const conta = await obterContaMesa(idconta);
			if (!conta) {
				throw new Error("Conta inválida");
			}
			lancamentos = [lancamentoUnico(lancamentosOuMeio, conta.valorrestante)];
		} else {
			lancamentos = lancamentosOuMeio;
		}
		const venda = await fecharContaMesa({ idconta, lancamentos, troco });
		const emitir = (await getConfig("emitir_nfce", "1")) === "1";
		let fiscal: {
			modo: "online" | "contingencia" | "nao_fiscal" | "erro";
			mensagem: string;
			cStat?: string;
		} = {
			modo: "nao_fiscal",
			mensagem: "Conta fechada",
		};

		if (emitir) {
			const result = await emitirOuContingencia({
				idvenda: venda.id,
				onlineEmitir: () => emitirNfceOnlineDaVenda(venda.id),
			});
			fiscal = {
				modo: result.modo,
				mensagem: result.mensagem,
				cStat: result.cStat,
			};
			if (result.modo === "nao_fiscal") {
				const nfce = await obterNfcePorVenda(venda.id);
				if (nfce?.chave) {
					await imprimirDanfce({
						vendaId: venda.id,
						chave: nfce.chave ?? undefined,
						qrcode: nfce.qrcode ?? undefined,
						contingencia: nfce.tpemis === 9,
						motivo: nfce.motivo_contingencia ?? undefined,
					});
				}
			}
		} else {
			await imprimirCupomNaoFiscal(venda.id);
		}

		void processarOutbox();
		avisarTecnibra();
		return { venda, fiscal };
	},

	async aplicarAjustesConta(
		idconta: string,
		ajustes: {
			numeropessoas?: number;
			taxaAtiva?: boolean;
			desconto?: number;
			senha?: string;
		},
	) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		return aplicarAjustesConta({ idconta, ...ajustes });
	},

	async validarSenhaGerencial(senha: string) {
		return validarSenhaGerencial(senha);
	},

	async senhaGerencialDefinida() {
		return senhaGerencialDefinida();
	},

	async imprimirPreConta(idconta: string) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		return imprimirPreConta(idconta);
	},

	async registrarPagamentoConta(
		idconta: string,
		lancamentos: LancamentoPagamento[],
		troco?: number,
	) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		const result = await registrarPagamentoConta({
			idconta,
			lancamentos,
			troco,
		});
		if (result.venda) {
			const emitir = (await getConfig("emitir_nfce", "1")) === "1";
			if (emitir) {
				await emitirOuContingencia({
					idvenda: result.venda.id,
					onlineEmitir: () => emitirNfceOnlineDaVenda(result.venda!.id),
				});
			} else {
				await imprimirCupomNaoFiscal(result.venda.id);
			}
			void processarOutbox();
			avisarTecnibra();
		}
		return result;
	},

	async fecharFatiaItens(
		idconta: string,
		idsItens: string[],
		lancamentos: LancamentoPagamento[],
		troco?: number,
	) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		const result = await fecharFatiaItens({
			idconta,
			idsItens,
			lancamentos,
			troco,
		});
		const emitir = (await getConfig("emitir_nfce", "1")) === "1";
		if (emitir) {
			await emitirOuContingencia({
				idvenda: result.venda.id,
				onlineEmitir: () => emitirNfceOnlineDaVenda(result.venda.id),
			});
		} else {
			await imprimirCupomNaoFiscal(result.venda.id);
		}
		void processarOutbox();
		avisarTecnibra();
		return result;
	},

	async transferirConta(idconta: string, numeroDestino: number) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		const conta = await transferirConta(idconta, numeroDestino);
		avisarTecnibra();
		return conta;
	},

	async transferirItens(
		idcontaOrigem: string,
		idsItens: string[],
		numeroDestino: number,
	) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		const result = await transferirItens({
			idcontaOrigem,
			idsItens,
			numeroDestino,
		});
		avisarTecnibra();
		return result;
	},

	async juntarContas(idOrigem: string, numeroDestino: number) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		const mesa = await obterMesa(numeroDestino);
		if (!mesa.idconta) {
			throw new Error("Destino sem conta aberta");
		}
		const conta = await juntarContas(idOrigem, mesa.idconta);
		avisarTecnibra();
		return conta;
	},

	async reimprimir(vendaId: string) {
		const nfce = await obterNfcePorVenda(vendaId);
		if (nfce?.chave) {
			return imprimirDanfce({
				vendaId,
				chave: nfce.chave ?? undefined,
				qrcode: nfce.qrcode ?? undefined,
				contingencia: nfce.tpemis === 9,
				motivo: nfce.motivo_contingencia ?? undefined,
			});
		}
		return imprimirCupomNaoFiscal(vendaId);
	},
};

export type LocalApi = typeof localApi;
