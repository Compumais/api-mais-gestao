import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { app } from "electron";
import {
	ApiError,
	baixaEstoqueVenda,
	buscarEmpresa,
	buscarNfceConfig,
	buscarPdvFiscal,
	criarItemVendaPdv,
	criarVendaPdv,
	extrairNfceDaBaixa,
	listarAtalhosRemotos,
	listarGrupos,
	listarGruposGourmet,
	listarProdutos,
	listarUnidadesMedida,
	pingApi,
	substituirAtalhosRemotos,
	transmitirNfceContingencia,
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
	totaisParaSync,
} from "../db/pagamento";
import {
	atualizarNumeracaoNfce,
	atualizarVendaSync,
	contarOutboxPendentes,
	type ItemCarrinho,
	type LancamentoPagamento,
	listarOutboxPendentes,
	marcarNfceTransmitida,
	marcarOutboxConcluido,
	marcarOutboxErro,
	obterSessao,
	obterVenda,
	salvarAtalhos,
	upsertGrupos,
	upsertGruposGourmet,
	upsertProdutos,
} from "../db/repos";

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
}> {
	const sessao = await obterSessao();
	if (!sessao.idempresa || !sessao.token) {
		return { produtos: 0, atalhos: 0, grupos: 0, gruposGourmet: 0 };
	}

	let totalGrupos = 0;
	{
		let page = 1;
		for (;;) {
			const grupos = await listarGrupos({
				idempresa: sessao.idempresa,
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
				idempresa: sessao.idempresa,
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

	const unidades = await listarUnidadesMedida(sessao.idempresa).catch(
		() =>
			[] as Array<{ id: string; codigo: string | null; nome: string | null }>,
	);
	const mapaUnidades = new Map(unidades.map((u) => [u.id, u] as const));

	let page = 1;
	let total = 0;
	for (;;) {
		const produtos = await listarProdutos({
			idempresa: sessao.idempresa,
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

	const ids = await listarAtalhosRemotos(sessao.idempresa);
	if (ids.length) {
		await salvarAtalhos(ids);
	}

	try {
		const fiscal = await sincronizarFiscalPdv();
		if (!fiscal.ok) {
			const cfg = await buscarNfceConfig(sessao.idempresa);
			const ambiente = Number(cfg.ambiente ?? 2);
			const cscId = ambiente === 1 ? cfg.idcsc_producao : cfg.idcsc_homologacao;
			const cscToken =
				ambiente === 1 ? cfg.csctoken_producao : cfg.csctoken_homologacao;
			let cnpj = cfg.cnpj ?? null;
			let uf: string | null = null;
			try {
				const empresa = await buscarEmpresa(sessao.idempresa);
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
		}
	} catch {
		// config NFC-e opcional no pull
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
				} else if (
					item.tipo === "abrir_caixa" ||
					item.tipo === "fechamento_caixa" ||
					item.tipo === "conta_mesa"
				) {
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

	return { processados, erros };
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
	// Já sincronizada no fluxo online — não recria na retaguarda.
	if (local?.idremoto) {
		return;
	}

	const venda = await criarVendaPdv({
		idempresa,
		numeropdv,
		usuarioquefechouvenda: userid,
		vendalocal: 2,
		valortotal: total,
		valortroco: sync.valortroco,
		valordinheiro: sync.valordinheiro,
		valorpix: sync.valorpix,
		valorcartaocredito: sync.valorcartaocredito,
		valorcartaodebito: sync.valorcartaodebito,
		valorcartao: sync.valorcartao,
		valorprepago: sync.valorprepago,
		pagamentos,
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

	const emitir = (await getConfig("emitir_nfce", "1")) === "1";
	if (!emitir) {
		await atualizarVendaSync(idlocal, { nfce_status: "nao_fiscal" });
		return;
	}

	try {
		const baixa = await baixaEstoqueVenda({
			idempresa,
			idvenda: venda.id,
			itens: itens.map((i) => ({
				idproduto: i.idproduto,
				quantidade: i.quantidade,
				precounitario: i.precounitario,
				nomeproduto: i.descricao,
			})),
			pagamentos: {
				valortotal: total,
				valortroco: sync.valortroco,
				valordinheiro: sync.valordinheiro,
				valorpix: sync.valorpix,
				valorcartaocredito: sync.valorcartaocredito,
				valorcartaodebito: sync.valorcartaodebito,
				valorcartao: sync.valorcartao,
				valorprepago: sync.valorprepago,
				desconto: Number(payload.valordesconto ?? 0),
				valortaxaservico: Number(payload.valortaxaservico ?? 0),
				valorcouverartistico: Number(payload.valorcouvert ?? 0),
			},
		});
		const nfce = extrairNfceDaBaixa(baixa);
		if (nfce.emitida) {
			await atualizarVendaSync(idlocal, { nfce_status: "autorizada" });
			const { persistirNfceOnlineLocal } = await import(
				"../fiscal/persistir-nfce-online"
			);
			await persistirNfceOnlineLocal({
				idvenda: idlocal,
				idnotafiscal: nfce.idnotafiscal,
				chave: nfce.chave,
				qrCode: nfce.qrCode,
				protocolo: nfce.protocolo,
				xml: nfce.xml,
				serie: nfce.serie,
				numero: nfce.numero,
			});
		} else if (nfce.erro) {
			await atualizarVendaSync(idlocal, { nfce_status: "erro" });
		}
	} catch (err) {
		if (
			err instanceof ApiError &&
			(err.status === 0 || err.status === 408 || (err.status ?? 0) >= 500)
		) {
			await atualizarVendaSync(idlocal, {
				nfce_status: "pendente_contingencia",
			});
			throw err;
		}
		// Validação/SEFAZ: venda já está na retaguarda — não reprocessa outbox.
		await atualizarVendaSync(idlocal, { nfce_status: "erro" });
	}
}

async function syncTransmitirContingencia(
	payload: Record<string, unknown>,
	idempresa: string,
): Promise<void> {
	const result = await transmitirNfceContingencia({
		idempresa,
		idvenda: payload.idvenda ? String(payload.idvenda) : undefined,
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
	if (payload.idvenda) {
		await atualizarVendaSync(String(payload.idvenda), {
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
	if (payload.meio != null && total > 0) {
		return [lancamentoUnico(normalizarMeioPagamento(payload.meio), total)];
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
