import { mkdir } from "node:fs/promises";
import { BrowserWindow, dialog, shell } from "electron";
import {
	ApiError,
	apiBaseUrl,
	baixaEstoqueVenda,
	buscarVendaPdvGourmet,
	criarItemVendaPdv,
	criarVendaPdv,
	extrairNfceDaBaixa,
	inutilizarNfceVendaPdv,
	isEmpresaAcessoNegado,
	listarEmpresas,
	loginEmail,
	obterMeuPlano,
	obterPerfilUsuario,
	pingApi,
	retransmitirNfceVendaPdv,
	substituirAtalhosRemotos,
	transmitirNfceContingencia,
	VENDA_LOCAL_PDV_HIBRIDO,
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
	pagamentosErpDosLancamentos,
	pagamentosNativosParaApi,
	totaisParaSync,
} from "../db/pagamento";
import {
	abrirCaixa,
	abrirContaMesa,
	abrirPedidoEntrega,
	adicionarItemConta,
	adicionarItemNaMesa,
	aplicarAjustesConta,
	aplicarTaxaEntrega,
	atualizarDadosEntrega,
	atualizarNfceLocalCampos,
	atualizarNomeClienteConta,
	atualizarStatusEntrega,
	atualizarVendaSync,
	buscarClientesLocal,
	buscarClientesPdv,
	buscarProdutoPorCodigo,
	buscarProdutoPorEan,
	buscarProdutosLocal,
	cancelarContaMesa as cancelarContaMesaRepo,
	type ClienteVenda,
	caixaAberto,
	caixaAbertoOutroOperador,
	calcularResumoTurnoAberto,
	concluirOutboxCriarVendaLocal,
	contarOutboxPendentes,
	criarVendaRapida,
	enfileirarOutbox,
	enviarPedidoConta,
	fecharCaixa,
	fecharContaMesa,
	fecharFatiaItens,
	ingestPedidoDelivery,
	type ItemCarrinho,
	juntarContas,
	type LancamentoPagamento,
	limparContasVazias,
	limparFilaPedidos,
	limparSessao,
	listarAtalhos,
	listarBandeirasCartaoLocal,
	listarCatalogoCarga,
	listarGruposGourmetLocal,
	listarGruposLocal,
	listarLancamentosVenda,
	listarMapeamentoImpressorasGourmet,
	listarMeiosPagamentoLocal,
	listarMesas,
	listarPedidosEntrega,
	listarPedidosFila,
	listarPizzasLocal,
	listarProdutosPorGrupo,
	listarProdutosPorGrupoGourmet,
	listarVendas,
	type MeioPagamento,
	marcarNfceTransmitida,
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
	rotuloOrigemConta,
	type SessaoLocal,
	salvarClientePdv,
	salvarConfiguracoes,
	salvarMapeamentoImpressorasGourmet,
	salvarSessao,
	senhaGerencialDefinida,
	transferirConta,
	transferirItens,
	validarSenhaGerencial,
} from "../db/repos";
import { emitirOuContingencia } from "../fiscal/contingencia";
import { exportarXmlsNfce as gravarXmlsNfcePeriodo } from "../fiscal/exportar-xml-nfce";
import {
	imprimirComprovanteFechamentoCaixa,
	imprimirCupomNaoFiscal,
	imprimirDanfce,
	imprimirPreConta,
	listarImpressoras,
	testarImpressora,
} from "../impressora/escpos";
import {
	agruparLinhasPedidoFila,
	imprimirProducaoPedido,
	rotuloOrigemMesa,
} from "../impressora/producao";
import { rotuloProducaoEntrega } from "../db/pedido-entrega";
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
import * as remoto from "../pdv-secundario/operacoes-remoto";
import {
	buscarOpcoesPdvNoPrincipal,
	ehSecundario,
	garantirOperacaoSecundario,
	puxarDoPrincipal,
	statusPrincipalCache,
	testarConexaoPrincipal,
	validarIdentidadeAoSalvar,
} from "../pdv-secundario/servico";
import {
	executarBackupPdv,
	reiniciarBackupAgendado,
	statusBackupPdv,
} from "../sync/backup-agendado";
import { puxarNfceDaRetaguarda } from "../sync/nfce-retaguarda";
import {
	processarOutbox,
	pullCatalogo,
	sincronizarFiscalPdv as puxarFiscalRetaguarda,
	statusConexao,
} from "../sync/outbox";
import { obterTerminaisPdvLocais } from "../sync/terminais-pdv";
import {
	arquivarSeTrocaEmpresa,
	consumirAvisoBackupEmpresa,
	lembrarEmpresaDaSessao,
} from "../sync/troca-empresa";

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

async function emitirNfceOnlineDaVenda(
	vendaId: string,
	emitirNfce = true,
): Promise<{
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
		const pagamentosErp = pagamentosErpDosLancamentos(pagamentos);
		let idremoto = venda.idremoto;
		if (!idremoto) {
			const criada = await criarVendaPdv({
				idempresa: sessao.idempresa,
				numeropdv: Number(await getConfig("numeropdv", "1")),
				usuarioquefechouvenda: sessao.userid,
				vendalocal: VENDA_LOCAL_PDV_HIBRIDO,
				valortotal: venda.valortotal,
				valortroco: sync.valortroco,
				valordinheiro: sync.valordinheiro,
				valorpix: sync.valorpix,
				valorcartaocredito: sync.valorcartaocredito,
				valorcartaodebito: sync.valorcartaodebito,
				valorcartao: sync.valorcartao,
				valorprepago: sync.valorprepago,
				pagamentos: pagamentosNativosParaApi(pagamentos),
				...(pagamentosErp.length ? { pagamentosErp } : {}),
				...(venda.idcliente?.trim()
					? { identidade: venda.idcliente.trim() }
					: {}),
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
				desconto: venda.valordesconto ?? 0,
				valortaxaservico: venda.valortaxaservico ?? 0,
				valorcouverartistico: venda.valorcouvert ?? 0,
			},
			emitirNfce,
		});
		await concluirOutboxCriarVendaLocal(vendaId);
		if (!emitirNfce) {
			await atualizarVendaSync(vendaId, { nfce_status: "nao_fiscal" });
			return { ok: true };
		}
		const nfce = extrairNfceDaBaixa(baixa);
		const { aplicarEmissaoNfceNaVendaLocal } = await import(
			"../fiscal/persistir-nfce-online"
		);
		await aplicarEmissaoNfceNaVendaLocal(vendaId, nfce);
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
		if (indisponivel) {
			const vendaAtual = await obterVenda(vendaId);
			const idremoto = vendaAtual?.idremoto;
			if (idremoto) {
				try {
					const remota = await buscarVendaPdvGourmet(idremoto);
					if (remota.idnotafiscalnfce) {
						return {
							ok: false,
							idnotafiscal: remota.idnotafiscalnfce,
							erro:
								err instanceof Error
									? err.message
									: "Falha na emissão (nota já na retaguarda)",
						};
					}
				} catch {
					// segue como indisponível e pode cair em contingência
				}
			}
		}
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
		const caixaOutroOperador = caixa ? null : await caixaAbertoOutroOperador();
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
			caixaOutroOperador,
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
			await lembrarEmpresaDaSessao();
			const result = await loginEmail(email, password);
			await salvarSessao({
				token: result.token,
				userid: result.userid,
				username: result.username,
				roles: null,
				idempresa: null,
				nomeempresa: null,
				modulogourmet: null,
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
		const backup = await arquivarSeTrocaEmpresa(idempresa, nomeempresa);
		await salvarSessao({ idempresa, nomeempresa, modulogourmet: null });
		await sincronizarModuloGourmet(await obterSessao());
		const vazio = {
			produtos: 0,
			atalhos: 0,
			grupos: 0,
			gruposGourmet: 0,
			clientes: 0,
			bandeiras: 0,
			meiosPagamento: 0,
		};
		const pull = (await ehSecundario())
			? await puxarDoPrincipal().catch(() => vazio)
			: await pullCatalogo().catch((err) => {
					if (isEmpresaAcessoNegado(err)) {
						throw err;
					}
					return vazio;
				});
		if ("acessoNegado" in pull && pull.acessoNegado) {
			throw new Error(
				"Este usuário não tem acesso à empresa selecionada. Escolha outra empresa.",
			);
		}
		void processarOutbox();
		return { ok: true, pull, backup };
	},

	async logout() {
		await lembrarEmpresaDaSessao();
		await limparSessao();
		return { ok: true };
	},

	async listarEmpresasSessao() {
		const sessao = await obterSessao();
		if (!sessao.token || !sessao.userid) {
			throw new Error("Faça login para listar as empresas");
		}
		return listarEmpresas(sessao.userid);
	},

	async consumirAvisoBackupEmpresa() {
		return consumirAvisoBackupEmpresa();
	},

	async statusBackup() {
		return statusBackupPdv();
	},

	async gerarBackup(pasta?: string) {
		return executarBackupPdv({
			motivo: "manual",
			pasta,
			forcar: true,
		});
	},

	async escolherPastaBackup() {
		const win = BrowserWindow.getFocusedWindow();
		if (!win) {
			return null;
		}
		const resultado = await dialog.showOpenDialog(win, {
			title: "Pasta para backups do PDV",
			properties: ["openDirectory", "createDirectory"],
		});
		if (resultado.canceled || !resultado.filePaths[0]) {
			return null;
		}
		return resultado.filePaths[0];
	},

	async abrirPastaBackup(pasta?: string) {
		const status = await statusBackupPdv();
		const destino = (pasta?.trim() || status.pastaEfetiva).trim();
		if (!destino) {
			throw new Error("Pasta de backup não configurada");
		}
		await mkdir(destino, { recursive: true });
		const erro = await shell.openPath(destino);
		if (erro) {
			throw new Error(erro);
		}
		return { ok: true, pasta: destino };
	},

	async exportarXmlsNfce(params: {
		dataInicio: string;
		dataFim: string;
		criterio: "emissao" | "autorizacao";
	}) {
		const win = BrowserWindow.getFocusedWindow();
		if (!win) {
			throw new Error("Janela do PDV indisponível");
		}
		const escolha = await dialog.showOpenDialog(win, {
			title: "Pasta para salvar os XMLs da NFC-e",
			properties: ["openDirectory", "createDirectory"],
		});
		if (escolha.canceled || !escolha.filePaths[0]) {
			return { cancelado: true as const, total: 0, ignorados: 0, pasta: "" };
		}
		const resultado = await gravarXmlsNfcePeriodo({
			dataInicio: params.dataInicio,
			dataFim: params.dataFim,
			criterio: params.criterio,
			pasta: escolha.filePaths[0],
		});
		const erro = await shell.openPath(resultado.pasta);
		if (erro) {
			throw new Error(erro);
		}
		return { cancelado: false as const, ...resultado };
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
		if (
			resto.backup_habilitado !== undefined ||
			resto.backup_pasta !== undefined ||
			resto.backup_frequencia !== undefined ||
			resto.backup_hora !== undefined ||
			resto.backup_manter !== undefined
		) {
			await reiniciarBackupAgendado();
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

	async buscarClientes(termo?: string) {
		return buscarClientesLocal(termo ?? "", 20);
	},

	async listarBandeirasCartao() {
		return listarBandeirasCartaoLocal();
	},

	async listarMeiosPagamento() {
		return listarMeiosPagamentoLocal();
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
		const caixa = await abrirCaixa(valorabertura);
		void processarOutbox();
		return caixa;
	},

	async resumoTurnoCaixa() {
		return calcularResumoTurnoAberto();
	},

	async fecharCaixa(saldoinformado: number, observacao?: string) {
		const fechamento = await fecharCaixa({
			saldoinformado: Number(saldoinformado) || 0,
			observacao,
		});
		void processarOutbox();
		void executarBackupPdv({ motivo: "caixa" }).catch((err) => {
			console.error(
				err instanceof Error
					? err.message
					: "Falha no backup ao fechar o caixa",
			);
		});
		try {
			await imprimirComprovanteFechamentoCaixa({
				nomeempresa: fechamento.nomeempresa,
				username: fechamento.username,
				numeropdv: fechamento.numeropdv,
				abertoem: fechamento.abertoem,
				fechadoem: fechamento.fechadoem,
				resumo: fechamento.resumo,
				conferencia: fechamento.conferencia,
				observacao: fechamento.observacao,
			});
		} catch (err) {
			console.error(
				err instanceof Error
					? err.message
					: "Falha ao imprimir comprovante de caixa",
			);
		}
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
		if (/^\d+$/.test(lido)) {
			const plu = Number(lido);
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
		}
		const porNome = await buscarProdutosLocal(lido, 8);
		if (porNome.length === 1) {
			const produto = porNome[0];
			return {
				produto,
				quantidade: 1,
				precounitario: produto.preco,
				precototal: produto.preco,
				pesado: false,
				origem: "nome" as const,
			};
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

	async listarTerminaisPdv() {
		return obterTerminaisPdvLocais();
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
		if (!secundario) {
			void puxarNfceDaRetaguarda().catch(() => 0);
		}
		return {
			ok: true as const,
			origem: secundario ? ("principal" as const) : ("nuvem" as const),
			produtos: pull.produtos,
			grupos: pull.grupos,
			gruposGourmet: pull.gruposGourmet,
			atalhos: pull.atalhos,
			clientes: pull.clientes,
			bandeiras: pull.bandeiras,
			meiosPagamento: pull.meiosPagamento,
		};
	},

	async testarPrincipal(params: {
		host: string;
		porta: string;
		numeropdv: string;
	}) {
		return testarConexaoPrincipal(params);
	},

	async buscarTerminaisPrincipal(params: { host: string; porta: string }) {
		return buscarOpcoesPdvNoPrincipal(params);
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
		cliente?: ClienteVenda | null;
		valordesconto?: number;
	}) {
		const desconto = Number(input.valordesconto) || 0;
		const subtotal = input.itens.reduce(
			(acc, item) => acc + item.precototal,
			0,
		);
		const total = Math.max(0, subtotal - desconto);
		const lancamentos = input.lancamentos?.length
			? input.lancamentos
			: [lancamentoUnico(input.meio ?? "DINHEIRO", total)];
		await garantirOperacaoSecundario();
		if (await ehSecundario()) {
			const result = await remoto.criarVendaRapidaRemoto({
				...input,
				lancamentos,
				valordesconto: desconto,
			});
			avisarTecnibra();
			return result;
		}
		const venda = await criarVendaRapida({
			itens: input.itens,
			lancamentos,
			troco: input.troco,
			cliente: input.cliente,
			valordesconto: desconto,
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
			await emitirNfceOnlineDaVenda(venda.id, false);
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
		if (await ehSecundario()) {
			await garantirOperacaoSecundario();
			return remoto.listarVendasRemoto();
		}
		return listarVendas(200);
	},

	async obterVenda(id: string) {
		if (await ehSecundario()) {
			await garantirOperacaoSecundario();
			return remoto.obterVendaRemoto(id);
		}
		return obterVenda(id);
	},

	async listarMesas() {
		await assertModuloGourmet();
		if (await ehSecundario()) {
			await garantirOperacaoSecundario();
			return remoto.listarMesasRemoto();
		}
		return listarMesas();
	},

	async obterMesa(numero: number) {
		await assertModuloGourmet();
		if (await ehSecundario()) {
			await garantirOperacaoSecundario();
			return remoto.obterMesaRemoto(numero);
		}
		return obterMesa(numero);
	},

	async obterContaPorNumero(numero: number) {
		await assertModuloGourmet();
		if (await ehSecundario()) {
			await garantirOperacaoSecundario();
			return remoto.obterContaPorNumeroRemoto(numero);
		}
		return obterContaPorNumero(numero);
	},

	async limparContasVazias() {
		await assertModuloGourmet();
		if (await ehSecundario()) {
			await garantirOperacaoSecundario();
			const removidas = await remoto.limparContasVaziasRemoto();
			avisarTecnibra();
			return removidas;
		}
		const removidas = await limparContasVazias();
		avisarTecnibra();
		return removidas;
	},

	async cancelarContaMesa(idconta: string) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		if (await ehSecundario()) {
			const result = await remoto.cancelarContaMesaRemoto(idconta);
			avisarTecnibra();
			return result;
		}
		await cancelarContaMesaRepo(idconta);
		avisarTecnibra();
		return { ok: true as const };
	},

	async abrirContaMesa(numero: number, nomecliente?: string) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		if (await ehSecundario()) {
			const conta = await remoto.abrirContaMesaRemoto(numero, nomecliente);
			avisarTecnibra();
			return conta;
		}
		const conta = await abrirContaMesa(numero, nomecliente);
		avisarTecnibra();
		return conta;
	},

	async obterContaMesa(id: string) {
		await assertModuloGourmet();
		if (await ehSecundario()) {
			await garantirOperacaoSecundario();
			return remoto.obterContaMesaRemoto(id);
		}
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
		if (await ehSecundario()) {
			const conta = await remoto.adicionarItemContaRemoto(idconta, item);
			avisarTecnibra();
			return conta;
		}
		const conta = await adicionarItemConta(idconta, item);
		avisarTecnibra();
		return conta;
	},

	async atualizarNomeClienteConta(idconta: string, nomecliente: string) {
		await assertModuloGourmet();
		if (await ehSecundario()) {
			await garantirOperacaoSecundario();
			return remoto.atualizarNomeClienteContaRemoto(idconta, nomecliente);
		}
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
		if (await ehSecundario()) {
			const conta = await remoto.enviarPedidoContaRemoto(
				idconta,
				clientOrderId,
				itens,
			);
			avisarTecnibra();
			return conta;
		}
		const conta = await enviarPedidoConta({ idconta, clientOrderId, itens });
		if (conta.pedidoNovo) {
			try {
				void imprimirProducaoPedido({
					origem: rotuloOrigemConta(conta),
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
		if (await ehSecundario()) {
			await garantirOperacaoSecundario();
			return remoto.listarPedidosFilaRemoto(pendentes);
		}
		return listarPedidosFila(pendentes);
	},

	async listarPedidosProducao(idconta?: string) {
		const linhas = await listarPedidosFila(false);
		const filtradas = idconta
			? linhas.filter((linha) => linha.idconta === idconta)
			: linhas;
		const grupos = agruparLinhasPedidoFila(filtradas);
		const pedidos = [];
		for (const itens of grupos) {
			const primeiro = itens[0];
			if (!primeiro) {
				continue;
			}
			const conta = await obterContaMesa(primeiro.idconta);
			const origem = conta
				? rotuloOrigemConta(conta)
				: await rotuloOrigemMesa(primeiro.numero_mesa);
			pedidos.push({
				clientOrderId: primeiro.client_order_id,
				idconta: primeiro.idconta,
				numeroMesa: primeiro.numero_mesa,
				nomecliente: primeiro.nomecliente,
				origem,
				criadoem: primeiro.criadoem,
				status: itens.some((item) => item.status === "pendente")
					? "pendente"
					: "entregue",
				itens: itens.map((item) => ({
					id: item.id,
					idproduto: item.idproduto,
					descricao: item.descricao,
					quantidade: item.quantidade,
					observacao: item.observacao,
				})),
			});
		}
		return pedidos;
	},

	async reimprimirPedidoProducao(clientOrderId: string) {
		const id = clientOrderId.trim();
		if (!id) {
			throw new Error("Pedido inválido");
		}
		const pedidos = await localApi.listarPedidosProducao();
		const pedido = pedidos.find((item) => item.clientOrderId === id);
		if (!pedido) {
			throw new Error("Pedido não encontrado");
		}
		await imprimirProducaoPedido({
			origem: pedido.origem,
			cliente: pedido.nomecliente,
			itens: pedido.itens,
			reimpressao: true,
		});
		return { ok: true };
	},

	async marcarPedidoEntregue(id: string) {
		if (await ehSecundario()) {
			await garantirOperacaoSecundario();
			return remoto.marcarPedidoEntregueRemoto(id);
		}
		await marcarPedidoEntregue(id);
		return { ok: true };
	},

	async limparFilaPedidos() {
		if (await ehSecundario()) {
			await garantirOperacaoSecundario();
			return remoto.limparFilaPedidosRemoto();
		}
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
		if (await ehSecundario()) {
			const conta = await remoto.adicionarItemNaMesaRemoto(
				numero,
				item,
				nomecliente,
			);
			avisarTecnibra();
			return conta;
		}
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
		cliente?: ClienteVenda | null,
	) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		const secundario = await ehSecundario();
		let lancamentos: LancamentoPagamento[];
		if (typeof lancamentosOuMeio === "string") {
			if (!ehMeioPagamento(lancamentosOuMeio)) {
				throw new Error("Meio de pagamento inválido");
			}
			const conta = secundario
				? await remoto.obterContaMesaRemoto(idconta)
				: await obterContaMesa(idconta);
			if (!conta) {
				throw new Error("Conta inválida");
			}
			lancamentos = [lancamentoUnico(lancamentosOuMeio, conta.valorrestante)];
		} else {
			lancamentos = lancamentosOuMeio;
		}
		if (secundario) {
			const result = await remoto.fecharContaMesaRemoto(
				idconta,
				lancamentos,
				troco,
				cliente,
			);
			avisarTecnibra();
			return result;
		}
		const venda = await fecharContaMesa({
			idconta,
			lancamentos,
			troco,
			cliente,
		});
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
			await emitirNfceOnlineDaVenda(venda.id, false);
			await imprimirCupomNaoFiscal(venda.id);
		}

		void processarOutbox();
		avisarTecnibra();
		return { venda, fiscal };
	},

	async listarPedidosEntrega(statusFiltro?: string | null) {
		await assertModuloGourmet();
		if (await ehSecundario()) {
			await garantirOperacaoSecundario();
			return remoto.listarPedidosEntregaRemoto(statusFiltro);
		}
		return listarPedidosEntrega(statusFiltro);
	},

	async abrirPedidoEntrega(params: {
		modalidade: "delivery" | "retirada";
		nomecliente?: string | null;
		telefone?: string | null;
		endereco?: string | null;
		bairro?: string | null;
		complemento?: string | null;
		referencia?: string | null;
		valorentrega?: number | null;
		idcliente?: string | null;
		obs?: string | null;
	}) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		if (await ehSecundario()) {
			const conta = await remoto.abrirPedidoEntregaRemoto(params);
			avisarTecnibra();
			return conta;
		}
		const conta = await abrirPedidoEntrega(params);
		avisarTecnibra();
		return conta;
	},

	async atualizarStatusEntrega(
		idconta: string,
		status?: "recebido" | "producao" | "saiu" | "entregue" | null,
	) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		if (await ehSecundario()) {
			return remoto.atualizarStatusEntregaRemoto(idconta, status);
		}
		return atualizarStatusEntrega(idconta, status);
	},

	async aplicarTaxaEntrega(idconta: string, valorentrega: number) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		if (await ehSecundario()) {
			const conta = await remoto.aplicarTaxaEntregaRemoto(
				idconta,
				valorentrega,
			);
			avisarTecnibra();
			return conta;
		}
		const conta = await aplicarTaxaEntrega(idconta, valorentrega);
		avisarTecnibra();
		return conta;
	},

	async atualizarDadosEntrega(
		idconta: string,
		dados: {
			nomecliente?: string | null;
			telefone?: string | null;
			endereco?: string | null;
			bairro?: string | null;
			complemento?: string | null;
			referencia?: string | null;
			obs?: string | null;
		},
	) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		if (await ehSecundario()) {
			return remoto.atualizarDadosEntregaRemoto(idconta, dados);
		}
		return atualizarDadosEntrega(idconta, dados);
	},

	async buscarClientesPdv(termo?: string, limit?: number) {
		await assertModuloGourmet();
		return buscarClientesPdv(termo, limit);
	},

	async salvarClientePdv(params: {
		id?: string;
		nome: string;
		telefone?: string | null;
		cnpjcpf?: string | null;
		endereco?: string | null;
		bairro?: string | null;
		complemento?: string | null;
		referencia?: string | null;
	}) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		return salvarClientePdv(params);
	},

	async ingestPedidoDelivery(params: {
		protocol: string;
		modalidade?: "delivery" | "retirada";
		nomecliente?: string | null;
		telefone?: string | null;
		endereco?: string | null;
		bairro?: string | null;
		complemento?: string | null;
		referencia?: string | null;
		documento?: string | null;
		valorentrega?: number | null;
		obs?: string | null;
		itens: Array<{
			idproduto?: string | null;
			ean?: string | null;
			codigo?: string | null;
			codigoproduto?: string | null;
			nomeproduto?: string | null;
			quantidade: number;
			precounitario?: number | null;
			observacao?: string | null;
		}>;
	}) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		const result = await ingestPedidoDelivery(params);
		if (result.action === "created" && result.itensProducao.length) {
			try {
				void imprimirProducaoPedido({
					origem:
						rotuloOrigemConta(result.conta) ||
						rotuloProducaoEntrega({
							modalidade: result.conta.modalidade,
							senhaChamada: result.conta.senha_chamada,
							protocolo: result.conta.orderidintegracao,
						}),
					cliente: result.conta.nomecliente,
					itens: result.itensProducao,
				});
			} catch {
				// produção não falha o ingest
			}
		}
		avisarTecnibra();
		return result;
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
		if (await ehSecundario()) {
			return remoto.aplicarAjustesContaRemoto(idconta, ajustes);
		}
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
		if (await ehSecundario()) {
			const conta = await remoto.obterContaMesaRemoto(idconta);
			if (!conta) {
				throw new Error("Conta inválida");
			}
			return imprimirPreConta(conta);
		}
		return imprimirPreConta(idconta);
	},

	async registrarPagamentoConta(
		idconta: string,
		lancamentos: LancamentoPagamento[],
		troco?: number,
	) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		if (await ehSecundario()) {
			const result = await remoto.registrarPagamentoContaRemoto(
				idconta,
				lancamentos,
				troco,
			);
			avisarTecnibra();
			return result;
		}
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
				await emitirNfceOnlineDaVenda(result.venda.id, false);
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
		cliente?: ClienteVenda | null,
	) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		if (await ehSecundario()) {
			const result = await remoto.fecharFatiaItensRemoto(
				idconta,
				idsItens,
				lancamentos,
				troco,
				cliente,
			);
			avisarTecnibra();
			return result;
		}
		const result = await fecharFatiaItens({
			idconta,
			idsItens,
			lancamentos,
			troco,
			cliente,
		});
		const emitir = (await getConfig("emitir_nfce", "1")) === "1";
		if (emitir) {
			await emitirOuContingencia({
				idvenda: result.venda.id,
				onlineEmitir: () => emitirNfceOnlineDaVenda(result.venda.id),
			});
		} else {
			await emitirNfceOnlineDaVenda(result.venda.id, false);
			await imprimirCupomNaoFiscal(result.venda.id);
		}
		void processarOutbox();
		avisarTecnibra();
		return result;
	},

	async transferirConta(idconta: string, numeroDestino: number) {
		await assertModuloGourmet();
		await garantirOperacaoSecundario();
		if (await ehSecundario()) {
			const conta = await remoto.transferirContaRemoto(
				idconta,
				numeroDestino,
			);
			avisarTecnibra();
			return conta;
		}
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
		if (await ehSecundario()) {
			const result = await remoto.transferirItensRemoto(
				idcontaOrigem,
				idsItens,
				numeroDestino,
			);
			avisarTecnibra();
			return result;
		}
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
		if (await ehSecundario()) {
			const conta = await remoto.juntarContasRemoto(idOrigem, numeroDestino);
			avisarTecnibra();
			return conta;
		}
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

	async retransmitirNfce(vendaId: string) {
		const venda = await obterVenda(vendaId);
		if (!venda) {
			throw new Error("Venda não encontrada");
		}

		const nfce = await obterNfcePorVenda(vendaId);
		const online = await pingApi();
		if (!online) {
			throw new Error(
				"Sem conexão com a retaguarda. Tente novamente quando estiver online.",
			);
		}

		const sessao = await obterSessao();
		if (!sessao.idempresa || !sessao.userid) {
			throw new Error("Sessão inválida");
		}

		const { aplicarEmissaoNfceNaVendaLocal } = await import(
			"../fiscal/persistir-nfce-online"
		);

		if (
			nfce &&
			nfce.tpemis === 9 &&
			nfce.status !== "transmitida" &&
			nfce.status !== "autorizada"
		) {
			let notaRemotaJaExiste = false;
			if (venda.idremoto) {
				try {
					const remota = await buscarVendaPdvGourmet(venda.idremoto);
					notaRemotaJaExiste = Boolean(remota.idnotafiscalnfce);
				} catch {
					notaRemotaJaExiste = false;
				}
			}

			if (!notaRemotaJaExiste) {
				await processarOutbox();
				const depois = await obterNfcePorVenda(vendaId);
				if (
					depois?.status === "transmitida" ||
					depois?.status === "autorizada"
				) {
					return {
						modo: "contingencia" as const,
						mensagem: "NFC-e de contingência enviada à retaguarda",
						chave: depois.chave ?? undefined,
					};
				}
				if (!nfce.xml) {
					throw new Error(
						"XML de contingência não encontrado para retransmitir",
					);
				}
				const result = await transmitirNfceContingencia({
					idempresa: sessao.idempresa,
					idvenda: venda.idremoto ?? undefined,
					xml: nfce.xml,
					chave: nfce.chave ?? undefined,
					serie: nfce.serie,
					numero: nfce.numero,
					motivo: nfce.motivo_contingencia ?? "Contingencia offline PDV",
					datacontingencia: new Date().toISOString(),
				});
				await marcarNfceTransmitida(nfce.id);
				await atualizarVendaSync(vendaId, {
					nfce_status: result.transmitida ? "transmitida" : "contingencia",
				});
				return {
					modo: "contingencia" as const,
					mensagem: result.transmitida
						? "NFC-e de contingência enviada à retaguarda"
						: (result.erro ??
							"Contingência registrada na retaguarda, aguardando SEFAZ"),
					chave: nfce.chave ?? undefined,
				};
			}
		}

		if (!venda.idremoto) {
			const resultado = await emitirNfceOnlineDaVenda(vendaId);
			if (resultado.ok) {
				await imprimirDanfce({
					chave: resultado.chave,
					qrcode: resultado.qrCode,
					contingencia: false,
					vendaId,
				});
				return {
					modo: "online" as const,
					mensagem: "NFC-e autorizada",
					chave: resultado.chave,
					qrcode: resultado.qrCode,
				};
			}
			return {
				modo: "erro" as const,
				mensagem: resultado.cStat
					? `NFC-e rejeitada (${resultado.cStat}): ${resultado.erro}`
					: (resultado.erro ?? "Falha na retransmissão da NFC-e"),
				cStat: resultado.cStat,
			};
		}

		const emissao = await retransmitirNfceVendaPdv({
			idempresa: sessao.idempresa,
			idvenda: venda.idremoto,
		});
		await aplicarEmissaoNfceNaVendaLocal(vendaId, {
			emitida: emissao.emitida,
			idnotafiscal: emissao.idnotafiscal,
			chave: emissao.chave,
			qrCode: emissao.qrCode,
			protocolo: emissao.protocolo,
			xml: emissao.xml,
			serie: emissao.serie,
			numero: emissao.numero,
		});

		if (emissao.emitida) {
			await imprimirDanfce({
				chave: emissao.chave,
				qrcode: emissao.qrCode,
				contingencia: false,
				vendaId,
			});
			return {
				modo: "online" as const,
				mensagem: "NFC-e autorizada",
				chave: emissao.chave,
				qrcode: emissao.qrCode,
			};
		}

		const motivo =
			emissao.erro ??
			emissao.xMotivo ??
			emissao.pendencias?.map((p) => p.mensagem).join("; ") ??
			"Falha na retransmissão da NFC-e";
		return {
			modo: "erro" as const,
			mensagem: emissao.cStat
				? `NFC-e rejeitada (${emissao.cStat}): ${motivo}`
				: `NFC-e rejeitada: ${motivo}`,
			cStat: emissao.cStat,
		};
	},

	async inutilizarNfce(vendaId: string, justificativa: string) {
		const venda = await obterVenda(vendaId);
		if (!venda) {
			throw new Error("Venda não encontrada");
		}

		const online = await pingApi();
		if (!online) {
			throw new Error(
				"Sem conexão com a retaguarda. Tente novamente quando estiver online.",
			);
		}

		const sessao = await obterSessao();
		if (!sessao.idempresa || !sessao.userid) {
			throw new Error("Sessão inválida");
		}

		if (!venda.idremoto) {
			await processarOutbox();
		}
		const vendaAtual = (await obterVenda(vendaId)) ?? venda;
		if (!vendaAtual.idremoto) {
			throw new Error(
				"Venda ainda não está na retaguarda. Sincronize e tente novamente.",
			);
		}

		const resultado = await inutilizarNfceVendaPdv({
			idempresa: sessao.idempresa,
			idvenda: vendaAtual.idremoto,
			justificativa,
		});

		const nfce = await obterNfcePorVenda(vendaId);
		if (nfce) {
			await atualizarNfceLocalCampos(nfce.id, {
				status: "inutilizada",
				transmitida: false,
			});
		}
		await atualizarVendaSync(vendaId, { nfce_status: "inutilizada" });

		return {
			modo: "inutilizada" as const,
			mensagem:
				resultado.xMotivo?.trim() || "Numeração da NFC-e inutilizada na SEFAZ",
			idnotafiscal: resultado.idnotafiscal,
			cStat: resultado.cStat,
			protocolo: resultado.protocolo,
		};
	},
};

export type LocalApi = typeof localApi;
