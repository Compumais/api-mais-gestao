import {
	ApiError,
	baixaEstoqueVenda,
	buscarEmpresa,
	buscarNfceConfig,
	criarItemVendaPdv,
	criarVendaPdv,
	extrairNfceDaBaixa,
	listarAtalhosRemotos,
	listarGrupos,
	listarGruposGourmet,
	listarProdutos,
	pingApi,
	transmitirNfceContingencia,
} from "../api/client";
import { execute, getConfig, isBancoIndisponivelError } from "../db/database";
import {
	atualizarNumeracaoNfce,
	atualizarVendaSync,
	contarOutboxPendentes,
	type ItemCarrinho,
	listarOutboxPendentes,
	type MeioPagamento,
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
		await upsertProdutos(produtos);
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
	const meio = payload.meio as MeioPagamento;
	const total = Number(payload.valortotal ?? 0);
	const idlocal = String(payload.idlocal);
	const numeropdv = Number(await getConfig("numeropdv", "1"));
	const zero = 0;
	const valortroco = Number(payload.valortroco ?? 0);
	const valordinheiro = meio === "DINHEIRO" ? total : zero;
	const valorpix = meio === "PIX" ? total : zero;
	const valorcartaocredito = meio === "CARTAO" ? total : zero;

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
		valortroco,
		valordinheiro,
		valorpix,
		valorcartaocredito,
		valorcartaodebito: zero,
		valorcartao: zero,
		valorprepago: zero,
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
				valortroco,
				valordinheiro,
				valorpix,
				valorcartaocredito,
				valorcartaodebito: zero,
				valorcartao: zero,
				valorprepago: zero,
			},
		});
		const nfce = extrairNfceDaBaixa(baixa);
		if (nfce.emitida) {
			await atualizarVendaSync(idlocal, { nfce_status: "autorizada" });
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

export function iniciarSyncPeriodico(intervalMs = 30000): NodeJS.Timeout {
	return setInterval(() => {
		void processarOutbox();
	}, intervalMs);
}
