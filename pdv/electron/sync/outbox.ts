import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { app } from "electron";
import {
	ApiError,
	atualizarFechamentoCaixaRemoto,
	baixaEstoqueVenda,
	buscarEmpresa,
	buscarEmpresaFiscal,
	buscarNfceConfig,
	buscarPdvFiscal,
	criarFechamentoCaixaRemoto,
	criarItemVendaPdv,
	criarVendaPdv,
	extrairNfceDaBaixa,
	isEmpresaAcessoNegado,
	listarAtalhosRemotos,
	listarBandeirasCartao,
	listarClientes,
	listarGrupos,
	listarGruposGourmet,
	listarProdutos,
	listarTiposDocumentoFinanceiro,
	listarUnidadesMedida,
	pingApi,
	STATUS_CAIXA_ABERTO,
	STATUS_CAIXA_FECHADO,
	substituirAtalhosRemotos,
	transmitirNfceContingencia,
	VENDA_LOCAL_PDV_HIBRIDO,
} from "../api/client";
import {
	execute,
	getConfig,
	isBancoIndisponivelError,
	setConfig,
} from "../db/database";
import {
	lancamentoUnico,
	normalizarLancamentos,
	normalizarMeioPagamento,
	pagamentosErpDosLancamentos,
	pagamentosNativosParaApi,
	totaisParaSync,
} from "../db/pagamento";
import {
	atualizarCaixaIdRemoto,
	atualizarNumeracaoNfce,
	atualizarVendaSync,
	calcularResumoTurno,
	contarOutboxPendentes,
	type ItemCarrinho,
	type LancamentoPagamento,
	listarOutboxPendentes,
	marcarNfceTransmitida,
	marcarOutboxConcluido,
	marcarOutboxErro,
	obterCaixaTurno,
	obterSessao,
	obterVenda,
	salvarAtalhos,
	salvarSessao,
	upsertBandeirasCartao,
	upsertClientes,
	upsertGrupos,
	upsertGruposGourmet,
	upsertMeiosPagamento,
	upsertProdutos,
} from "../db/repos";
import { calcularConferenciaCaixa } from "../db/resumo-turno-caixa";
import { persistirMeiosPagamentoNfceConfig } from "../fiscal/avaliar-emissao-nfce-venda";
import {
	avaliarEmissaoNfcePorPagamento,
	CHAVE_CONFIG_MEIOS_NFCE,
	parseMeiosPagamentoNfceConfig,
	resumoPagamentoParaNfce,
} from "../fiscal/meios-pagamento-nfce";
import { puxarNfceDaRetaguarda } from "./nfce-retaguarda";
import { atualizarCacheTerminaisPdv } from "./terminais-pdv";

let syncing = false;

export async function statusConexao(): Promise<{
	online: boolean;
	outboxPendentes: number;
}> {
	const online = await pingApi();
	return { online, outboxPendentes: await contarOutboxPendentes() };
}

export async function pullCatalogo(): Promise<{
	produtos: number;
	atalhos: number;
	grupos: number;
	gruposGourmet: number;
	clientes: number;
	bandeiras: number;
	meiosPagamento: number;
	acessoNegado?: boolean;
}> {
	const sessao = await obterSessao();
	if (!sessao.idempresa || !sessao.token) {
		return {
			produtos: 0,
			atalhos: 0,
			grupos: 0,
			gruposGourmet: 0,
			clientes: 0,
			bandeiras: 0,
			meiosPagamento: 0,
		};
	}

	try {
		return await puxarCatalogoDaEmpresa(sessao.idempresa);
	} catch (err) {
		if (isEmpresaAcessoNegado(err)) {
			await salvarSessao({
				idempresa: null,
				nomeempresa: null,
				modulogourmet: null,
			});
			return {
				produtos: 0,
				atalhos: 0,
				grupos: 0,
				gruposGourmet: 0,
				clientes: 0,
				bandeiras: 0,
				meiosPagamento: 0,
				acessoNegado: true,
			};
		}
		throw err;
	}
}

async function puxarCatalogoDaEmpresa(idempresa: string): Promise<{
	produtos: number;
	atalhos: number;
	grupos: number;
	gruposGourmet: number;
	clientes: number;
	bandeiras: number;
	meiosPagamento: number;
}> {
	let totalGrupos = 0;
	{
		let page = 1;
		for (;;) {
			const grupos = await listarGrupos({
				idempresa,
				page,
				limit: 100,
			});
			if (!grupos.length) {
				break;
			}
			await upsertGrupos(grupos);
			totalGrupos += grupos.length;
			if (grupos.length < 100 || page > 50) {
				break;
			}
			page += 1;
		}
	}

	let totalGruposGourmet = 0;
	{
		let page = 1;
		for (;;) {
			const grupos = await listarGruposGourmet({
				idempresa,
				page,
				limit: 100,
			});
			if (!grupos.length) {
				break;
			}
			await upsertGruposGourmet(grupos);
			totalGruposGourmet += grupos.length;
			if (grupos.length < 100 || page > 50) {
				break;
			}
			page += 1;
		}
	}

	const unidades = await listarUnidadesMedida(idempresa).catch(
		() =>
			[] as Array<{ id: string; codigo: string | null; nome: string | null }>,
	);
	const mapaUnidades = new Map(unidades.map((u) => [u.id, u] as const));

	let page = 1;
	let total = 0;
	for (;;) {
		const produtos = await listarProdutos({
			idempresa,
			page,
			limit: 100,
		});
		if (!produtos.length) {
			break;
		}
		await upsertProdutos(
			produtos.map((p) => {
				const atual = p.unidademedida?.trim();
				if (atual) return p;
				const unidade = p.idunidademedida
					? mapaUnidades.get(p.idunidademedida)
					: undefined;
				const sigla = unidade?.codigo?.trim() || unidade?.nome?.trim() || null;
				return { ...p, unidademedida: sigla };
			}),
		);
		total += produtos.length;
		if (produtos.length < 100) {
			break;
		}
		page += 1;
		if (page > 50) {
			break;
		}
	}

	const ids = await listarAtalhosRemotos(idempresa);
	if (ids.length) {
		await salvarAtalhos(ids);
	}

	let totalClientes = 0;
	try {
		let page = 1;
		for (;;) {
			const clientes = await listarClientes({
				idempresa,
				page,
				limit: 100,
			});
			if (!clientes.length) {
				break;
			}
			await upsertClientes(clientes);
			totalClientes += clientes.length;
			if (clientes.length < 100 || page > 50) {
				break;
			}
			page += 1;
		}
	} catch {
		// catálogo de clientes opcional no pull
	}

	let totalBandeiras = 0;
	try {
		let page = 1;
		for (;;) {
			const bandeiras = await listarBandeirasCartao({
				idempresa,
				page,
				limit: 100,
			});
			if (!bandeiras.length) {
				break;
			}
			await upsertBandeirasCartao(bandeiras);
			totalBandeiras += bandeiras.length;
			if (bandeiras.length < 100 || page > 20) {
				break;
			}
			page += 1;
		}
	} catch {
		// cadastro de bandeiras opcional no pull
	}

	let totalMeios = 0;
	try {
		let page = 1;
		for (;;) {
			const meios = await listarTiposDocumentoFinanceiro({
				idempresa,
				page,
				limit: 100,
			});
			if (!meios.length) {
				break;
			}
			await upsertMeiosPagamento(meios);
			totalMeios += meios.length;
			if (meios.length < 100 || page > 20) {
				break;
			}
			page += 1;
		}
	} catch {
		// formas ERP opcionais no pull
	}

	try {
		const fiscal = await sincronizarFiscalPdv();
		const cfg = await buscarNfceConfig(idempresa);
		await persistirMeiosPagamentoNfceConfig(cfg.meiospagamentonfce);
		if (!fiscal.ok) {
			const ambiente = Number(cfg.ambiente ?? 2);
			const cscId = ambiente === 1 ? cfg.idcsc_producao : cfg.idcsc_homologacao;
			const cscToken =
				ambiente === 1 ? cfg.csctoken_producao : cfg.csctoken_homologacao;
			let cnpj = cfg.cnpj ?? null;
			let uf: string | null = null;
			try {
				const empresa = await buscarEmpresa(idempresa);
				cnpj = empresa.cnpj ?? cnpj;
				uf = empresa.uf ?? null;
			} catch {
				// empresa opcional
			}
			await atualizarNumeracaoNfce({
				csc_id: cscId ?? null,
				csc_token: cscToken ?? null,
				ambiente,
				cnpj,
				uf,
			});
			await cachearEmitenteDanfce(idempresa, cnpj, uf);
		}
	} catch {
		// config NFC-e opcional no pull
	}

	try {
		await atualizarCacheTerminaisPdv();
	} catch {
		// cadastro de terminais opcional no pull
	}

	await execute(
		`INSERT INTO sync_meta (chave, valor, atualizadoem) VALUES ('ultimo_pull', $1, $2)
		 ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, atualizadoem = excluded.atualizadoem`,
		[String(total), new Date().toISOString()],
	);

	return {
		produtos: total,
		atalhos: ids.length,
		grupos: totalGrupos,
		gruposGourmet: totalGruposGourmet,
		clientes: totalClientes,
		bandeiras: totalBandeiras,
		meiosPagamento: totalMeios,
	};
}

async function gravarCertificadoPfx(
	pfxBase64: string,
	senha: string,
): Promise<void> {
	const dir = join(app.getPath("userData"), "certificados");
	await mkdir(dir, { recursive: true });
	const caminho = join(dir, "nfce.pfx");
	await writeFile(caminho, Buffer.from(pfxBase64, "base64"));
	await setConfig("certificado_path", caminho);
	await setConfig("certificado_senha", senha);
}

async function cachearEmitenteDanfce(
	idempresa: string,
	cnpj?: string | null,
	uf?: string | null,
): Promise<void> {
	const { CHAVE_EMITENTE_DANFCE } = await import("../impressora/danfce");
	let nome = "";
	let ie: string | undefined;
	let logradouro: string | undefined;
	let numero: string | undefined;
	let bairro: string | undefined;
	let municipio: string | undefined;
	let fone: string | undefined;
	let crt: number | undefined;
	let cnpjFinal = cnpj ?? undefined;
	let ufFinal = uf ?? undefined;
	try {
		const fiscal = await buscarEmpresaFiscal(idempresa);
		nome = (fiscal.razaosocial || fiscal.nomefantasia || "").trim();
		ie = fiscal.inscricaoestadual ?? undefined;
		logradouro = fiscal.logradouro ?? undefined;
		numero = fiscal.numero ?? undefined;
		bairro = fiscal.bairro ?? undefined;
		ufFinal = fiscal.uf ?? ufFinal;
		fone = fiscal.telefone ?? undefined;
		if (fiscal.crt != null && Number.isFinite(fiscal.crt)) {
			crt = fiscal.crt;
		}
	} catch {
		// cadastro fiscal opcional
	}
	try {
		const empresa = await buscarEmpresa(idempresa);
		nome = nome || (empresa.nome ?? empresa.razaosocial ?? "");
		cnpjFinal = cnpjFinal || empresa.cnpj || undefined;
		ufFinal = ufFinal || empresa.uf || undefined;
		fone = fone || empresa.telefone || undefined;
		logradouro = logradouro || empresa.endereco || undefined;
		numero = numero || empresa.numero || undefined;
		bairro = bairro || empresa.bairro || undefined;
	} catch {
		// empresa opcional
	}
	await setConfig(
		CHAVE_EMITENTE_DANFCE,
		JSON.stringify({
			nome,
			cnpj: cnpjFinal ?? "",
			ie,
			logradouro,
			numero,
			bairro,
			municipio,
			uf: ufFinal,
			fone,
			crt,
		}),
	);
}

export async function sincronizarFiscalPdv(): Promise<{
	ok: boolean;
	erro?: string;
}> {
	const sessao = await obterSessao();
	if (!sessao.idempresa || !sessao.token) {
		return { ok: false, erro: "Sessão inválida" };
	}

	const numeropdv = Math.max(1, Number(await getConfig("numeropdv", "1")) || 1);

	try {
		const fiscal = await buscarPdvFiscal(sessao.idempresa, numeropdv);
		const serie = Number(fiscal.serie);
		await atualizarNumeracaoNfce({
			...(Number.isFinite(serie) && serie > 0 ? { serie } : {}),
			proximo_numero: fiscal.numeroproximo,
			csc_id: fiscal.csc_id,
			csc_token: fiscal.csc_token,
			ambiente: fiscal.ambiente,
			cnpj: fiscal.cnpj,
			uf: fiscal.uf,
		});

		if (fiscal.certificado?.pfxBase64) {
			await gravarCertificadoPfx(
				fiscal.certificado.pfxBase64,
				fiscal.certificado.senha,
			);
			await setConfig("certificado_apelido", fiscal.certificado.apelido);
			await setConfig(
				"certificado_validade",
				fiscal.certificado.validadefim ?? "",
			);
		} else {
			await setConfig("certificado_apelido", "");
			await setConfig("certificado_validade", "");
		}

		await setConfig("fiscal_sync_erro", "");
		await setConfig("fiscal_ultima_sync", new Date().toISOString());
		await cachearEmitenteDanfce(sessao.idempresa, fiscal.cnpj, fiscal.uf);
		try {
			const cfg = await buscarNfceConfig(sessao.idempresa);
			await persistirMeiosPagamentoNfceConfig(cfg.meiospagamentonfce);
		} catch {
			// meios de pagamento NFC-e opcionais neste sync
		}
		return { ok: true };
	} catch (err) {
		const erro =
			err instanceof Error ? err.message : "Falha ao buscar dados fiscais";
		await setConfig("fiscal_sync_erro", erro);
		return { ok: false, erro };
	}
}

export async function processarOutbox(): Promise<{
	processados: number;
	erros: number;
}> {
	if (syncing) {
		return { processados: 0, erros: 0 };
	}
	syncing = true;
	let processados = 0;
	let erros = 0;

	try {
		const online = await pingApi();
		if (!online) {
			return { processados, erros };
		}

		const sessao = await obterSessao();
		if (!sessao.idempresa || !sessao.token || !sessao.userid) {
			return { processados, erros };
		}

		for (const item of await listarOutboxPendentes()) {
			try {
				const payload = JSON.parse(item.payload) as Record<string, unknown>;
				if (item.tipo === "criar_venda") {
					await syncCriarVenda(payload, sessao.idempresa, sessao.userid);
				} else if (item.tipo === "transmitir_nfce_contingencia") {
					await syncTransmitirContingencia(payload, sessao.idempresa);
				} else if (item.tipo === "atalhos_pdv") {
					const ids = Array.isArray(payload.idsProdutos)
						? payload.idsProdutos.map((id) => String(id))
						: [];
					await substituirAtalhosRemotos(sessao.idempresa, ids);
				} else if (item.tipo === "abrir_caixa") {
					await syncAbrirCaixa(payload);
				} else if (item.tipo === "fechamento_caixa") {
					await syncFecharCaixa(payload, sessao.idempresa, sessao.userid);
				} else if (item.tipo === "conta_mesa") {
					// Espelhamento remoto best-effort; marcado concluído para não travar a fila
				}
				await marcarOutboxConcluido(item.id);
				processados += 1;
			} catch (err) {
				erros += 1;
				await marcarOutboxErro(
					item.id,
					err instanceof Error ? err.message : "Erro desconhecido",
				);
			}
		}
	} catch (err) {
		if (!isBancoIndisponivelError(err)) {
			throw err;
		}
	} finally {
		syncing = false;
	}

	void puxarNfceDaRetaguarda().catch(() => undefined);

	return { processados, erros };
}

function moneyApi(valor: unknown): string {
	const n = Number(valor ?? 0);
	return (Number.isFinite(n) ? n : 0).toFixed(2);
}

async function garantirCaixaRemoto(
	payload: Record<string, unknown>,
	idempresa: string,
	userid: string,
): Promise<string> {
	const idlocal = String(payload.idlocal ?? "");
	const local = idlocal ? await obterCaixaTurno(idlocal) : null;
	if (local?.idremoto) {
		return local.idremoto;
	}

	const idusuario = String(payload.idusuario ?? local?.idusuario ?? userid);
	const idremoto = await criarFechamentoCaixaRemoto({
		idempresa: String(payload.idempresa ?? local?.idempresa ?? idempresa),
		pdv: Number(payload.numeropdv ?? local?.numeropdv ?? 1),
		idusuario,
		idusuariosuprimento: idusuario,
		suprimentoinicial: moneyApi(
			payload.valorabertura ?? local?.valorabertura ?? 0,
		),
		status: STATUS_CAIXA_ABERTO,
		local: 1,
		datahora: String(
			payload.abertoem ?? local?.abertoem ?? new Date().toISOString(),
		),
	});

	if (idlocal) {
		await atualizarCaixaIdRemoto(idlocal, idremoto);
	}
	return idremoto;
}

async function syncAbrirCaixa(payload: Record<string, unknown>): Promise<void> {
	const sessao = await obterSessao();
	if (!sessao.idempresa || !sessao.userid) {
		throw new Error("Sessão inválida para abrir caixa remoto");
	}
	await garantirCaixaRemoto(payload, sessao.idempresa, sessao.userid);
}

async function syncFecharCaixa(
	payload: Record<string, unknown>,
	idempresa: string,
	userid: string,
): Promise<void> {
	const idremoto = await garantirCaixaRemoto(payload, idempresa, userid);
	const idlocal = String(payload.idlocal ?? "");
	const local = idlocal ? await obterCaixaTurno(idlocal) : null;

	let saldoapurado = Number(payload.saldoapurado);
	let sobra = Number(payload.sobra);
	let falta = Number(payload.falta);
	let saldoinformadoNum = Number(
		payload.saldoinformado ?? payload.valorfechamento ?? 0,
	);

	const precisaRecalcular =
		!Number.isFinite(saldoapurado) ||
		!Number.isFinite(sobra) ||
		!Number.isFinite(falta);

	if (precisaRecalcular && local) {
		const resumo = await calcularResumoTurno(local);
		const conferencia = calcularConferenciaCaixa(
			saldoinformadoNum,
			resumo.saldoCaixaFisico,
		);
		saldoapurado = resumo.saldoapurado;
		sobra = conferencia.sobra;
		falta = conferencia.falta;
		saldoinformadoNum = conferencia.saldoinformado;
	}

	const saldoinformado = moneyApi(saldoinformadoNum);
	await atualizarFechamentoCaixaRemoto(idremoto, {
		status: STATUS_CAIXA_FECHADO,
		saldoapurado: moneyApi(saldoapurado),
		saldoinformado,
		saldoconferido: moneyApi(payload.saldoconferido ?? saldoinformado),
		sobra: moneyApi(sobra),
		falta: moneyApi(falta),
		idusuariofechamento: userid,
		observacao:
			typeof payload.observacao === "string" && payload.observacao.trim()
				? payload.observacao.trim()
				: null,
		datahora: String(payload.fechadoem ?? new Date().toISOString()),
	});
}

async function baixarEstoqueVendaOutbox(params: {
	idlocal: string;
	idremoto: string;
	idempresa: string;
	itens: ItemCarrinho[];
	total: number;
	sync: ReturnType<typeof totaisParaSync>;
	payload: Record<string, unknown>;
}): Promise<void> {
	const emitirGlobal = (await getConfig("emitir_nfce", "1")) === "1";
	const meios = parseMeiosPagamentoNfceConfig(
		await getConfig(CHAVE_CONFIG_MEIOS_NFCE, ""),
	);
	const emitir =
		emitirGlobal &&
		avaliarEmissaoNfcePorPagamento(resumoPagamentoParaNfce(params.sync), meios)
			.deveEmitir;
	try {
		const baixa = await baixaEstoqueVenda({
			idempresa: params.idempresa,
			idvenda: params.idremoto,
			itens: params.itens.map((i) => ({
				idproduto: i.idproduto,
				quantidade: i.quantidade,
				precounitario: i.precounitario,
				nomeproduto: i.descricao,
			})),
			pagamentos: {
				valortotal: params.total,
				valortroco: params.sync.valortroco,
				valordinheiro: params.sync.valordinheiro,
				valorpix: params.sync.valorpix,
				valorcartaocredito: params.sync.valorcartaocredito,
				valorcartaodebito: params.sync.valorcartaodebito,
				valorcartao: params.sync.valorcartao,
				valorprepago: params.sync.valorprepago,
				desconto: Number(params.payload.valordesconto ?? 0),
				valortaxaservico: Number(params.payload.valortaxaservico ?? 0),
				valorcouverartistico: Number(params.payload.valorcouvert ?? 0),
				valorentrega: Number(params.payload.valorentrega ?? 0),
			},
			emitirNfce: emitir,
		});
		if (!emitir) {
			await atualizarVendaSync(params.idlocal, { nfce_status: "nao_fiscal" });
			return;
		}
		const nfce = extrairNfceDaBaixa(baixa);
		if (!nfce.deveEmitirNfce) {
			await atualizarVendaSync(params.idlocal, { nfce_status: "nao_fiscal" });
			return;
		}
		const { aplicarEmissaoNfceNaVendaLocal } = await import(
			"../fiscal/persistir-nfce-online"
		);
		await aplicarEmissaoNfceNaVendaLocal(params.idlocal, nfce);
		if (nfce.emitida) {
			await atualizarVendaSync(params.idlocal, { nfce_status: "autorizada" });
		}
	} catch (err) {
		if (
			err instanceof ApiError &&
			(err.status === 0 || err.status === 408 || (err.status ?? 0) >= 500)
		) {
			if (emitir) {
				await atualizarVendaSync(params.idlocal, {
					nfce_status: "pendente_contingencia",
				});
			}
			throw err;
		}
		if (emitir) {
			await atualizarVendaSync(params.idlocal, { nfce_status: "erro" });
		}
	}
}

async function syncCriarVenda(
	payload: Record<string, unknown>,
	idempresa: string,
	userid: string,
): Promise<void> {
	const itens = payload.itens as ItemCarrinho[];
	const total = Number(payload.valortotal ?? 0);
	const idlocal = String(payload.idlocal);
	const numeropdv = Number(await getConfig("numeropdv", "1"));
	const valortroco = Number(payload.valortroco ?? 0);
	const pagamentos = resolverPagamentosPayload(payload, total);
	const sync = totaisParaSync(pagamentos, valortroco);

	const local = await obterVenda(idlocal);
	if (local?.idremoto) {
		await baixarEstoqueVendaOutbox({
			idlocal,
			idremoto: local.idremoto,
			idempresa,
			itens,
			total,
			sync,
			payload,
		});
		return;
	}

	const pagamentosErp = pagamentosErpDosLancamentos(pagamentos);
	const identidade = [payload.identidade, local?.idcliente]
		.map((valor) => (typeof valor === "string" ? valor.trim() : ""))
		.find(Boolean);
	const venda = await criarVendaPdv({
		idempresa,
		numeropdv,
		usuarioquefechouvenda: userid,
		vendalocal: VENDA_LOCAL_PDV_HIBRIDO,
		valortotal: total,
		valortroco: sync.valortroco,
		valordinheiro: sync.valordinheiro,
		valorpix: sync.valorpix,
		valorcartaocredito: sync.valorcartaocredito,
		valorcartaodebito: sync.valorcartaodebito,
		valorcartao: sync.valorcartao,
		valorprepago: sync.valorprepago,
		pagamentos: pagamentosNativosParaApi(pagamentos),
		...(pagamentosErp.length ? { pagamentosErp } : {}),
		...(identidade ? { identidade } : {}),
	});

	await atualizarVendaSync(idlocal, {
		idremoto: venda.id,
		sync_status: "sincronizado",
	});

	for (const item of itens) {
		await criarItemVendaPdv({
			idempresa,
			idvenda: venda.id,
			idproduto: item.idproduto,
			quantidade: item.quantidade,
			precounitario: item.precounitario,
			precototal: item.precototal,
			precopromocao: 0,
			precoalterado: 0,
			descricao: item.descricao,
		});
	}

	await baixarEstoqueVendaOutbox({
		idlocal,
		idremoto: venda.id,
		idempresa,
		itens,
		total,
		sync,
		payload,
	});
}

async function syncTransmitirContingencia(
	payload: Record<string, unknown>,
	idempresa: string,
): Promise<void> {
	const idlocal = payload.idvenda ? String(payload.idvenda) : "";
	const local = idlocal ? await obterVenda(idlocal) : null;
	if (
		local &&
		(local.nfce_status === "autorizada" ||
			local.nfce_status === "erro" ||
			local.nfce_status === "transmitida")
	) {
		if (payload.idnfce_local) {
			await marcarNfceTransmitida(String(payload.idnfce_local));
		}
		return;
	}

	const result = await transmitirNfceContingencia({
		idempresa,
		idvenda: local?.idremoto ?? (idlocal || undefined),
		xml: String(payload.xml),
		chave: payload.chave ? String(payload.chave) : undefined,
		serie: Number(payload.serie),
		numero: Number(payload.numero),
		motivo: String(payload.motivo ?? "Contingencia offline PDV"),
		datacontingencia: String(payload.datacontingencia),
	});

	if (payload.idnfce_local) {
		await marcarNfceTransmitida(String(payload.idnfce_local));
	}
	if (idlocal) {
		await atualizarVendaSync(idlocal, {
			nfce_status: result.transmitida ? "transmitida" : "contingencia",
		});
	}
}

function resolverPagamentosPayload(
	payload: Record<string, unknown>,
	total: number,
): LancamentoPagamento[] {
	const lista = normalizarLancamentos(
		payload.pagamentos ?? payload.lancamentos,
	);
	if (lista.length) {
		return lista;
	}
	const fromTotais: LancamentoPagamento[] = [];
	const dinheiro = Number(payload.valordinheiro ?? 0);
	const pix = Number(payload.valorpix ?? 0);
	const cartao = Number(payload.valorcartao ?? 0);
	if (dinheiro > 0) {
		fromTotais.push(lancamentoUnico("DINHEIRO", dinheiro));
	}
	if (pix > 0) {
		fromTotais.push(lancamentoUnico("PIX", pix));
	}
	if (cartao > 0) {
		fromTotais.push(lancamentoUnico("CARTAO", cartao));
	}
	if (fromTotais.length) {
		return fromTotais;
	}
	const meio = String(payload.meio ?? "")
		.trim()
		.toUpperCase();
	if (meio && meio !== "MISTO" && total > 0) {
		return [lancamentoUnico(normalizarMeioPagamento(meio), total)];
	}
	return [];
}

export function iniciarSyncPeriodico(intervalMs = 30000): NodeJS.Timeout {
	return setInterval(() => {
		void (async () => {
			try {
				const { sincronizarSecundarioPeriodico } = await import(
					"../pdv-secundario/servico"
				);
				await sincronizarSecundarioPeriodico();
			} catch {
				// status do principal já fica no cache
			}
			void processarOutbox();
		})();
	}, intervalMs);
}
