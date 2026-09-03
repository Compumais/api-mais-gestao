import { v4 as uuidv4 } from "uuid";
import {
	type ManifestoNfcePdv,
	pingApi,
	type RespostaReconciliacaoNfcePdv,
	reconciliarNfcePdv,
} from "../api/client";
import { execute, getConfig } from "../db/database";
import {
	atualizarVendaSync,
	listarVendasCandidatasReconciliacaoNfce,
	marcarVendaNfceSincronizada,
	obterSessao,
	obterSyncMeta,
} from "../db/repos";
import { aplicarNfceRetaguardaNaVendaLocal } from "./nfce-retaguarda";
import { processarOutbox } from "./outbox";

export type ResumoReconciliacaoNfce = {
	cicloId: string;
	total: number;
	atualizadas: number;
	registradas: number;
	conflitos: number;
	falhas: number;
	outboxProcessados: number;
	outboxErros: number;
};

let cicloEmAndamento: Promise<ResumoReconciliacaoNfce> | null = null;

async function salvarMeta(chave: string, valor: string): Promise<void> {
	await execute(
		`INSERT INTO sync_meta (chave, valor, atualizadoem) VALUES ($1, $2, $3)
		 ON CONFLICT (chave) DO UPDATE
		 SET valor = excluded.valor, atualizadoem = excluded.atualizadoem`,
		[chave, valor, new Date().toISOString()],
	);
}

export function emLotesPorTamanho(
	itens: ManifestoNfcePdv[],
	maxItens = 50,
	maxBytes = 8 * 1024 * 1024,
): ManifestoNfcePdv[][] {
	const lotes: ManifestoNfcePdv[][] = [];
	let lote: ManifestoNfcePdv[] = [];
	let bytes = 2;
	for (const item of itens) {
		const itemBytes = Buffer.byteLength(JSON.stringify(item), "utf8") + 1;
		if (
			lote.length > 0 &&
			(lote.length >= maxItens || bytes + itemBytes > maxBytes)
		) {
			lotes.push(lote);
			lote = [];
			bytes = 2;
		}
		lote.push(item);
		bytes += itemBytes;
	}
	if (lote.length > 0) lotes.push(lote);
	return lotes;
}

export function cursorComSobreposicao(
	cursor: string,
	sobreposicaoMs = 2 * 60_000,
): string {
	const [instante] = cursor.split("|", 1);
	const timestamp = Date.parse(instante ?? "");
	if (!Number.isFinite(timestamp)) return cursor;
	return `${new Date(timestamp - sobreposicaoMs).toISOString()}|`;
}

async function aplicarResposta(
	resposta: RespostaReconciliacaoNfcePdv,
): Promise<void> {
	for (const item of resposta.itens) {
		if (item.idvendaremoto) {
			await atualizarVendaSync(item.idvendalocal, {
				idremoto: item.idvendaremoto,
				sync_status: "sincronizado",
			});
		}
		if (!item.existeRetaguarda || item.status == null) continue;
		await aplicarNfceRetaguardaNaVendaLocal(item.idvendalocal, {
			idnotafiscal: item.idnotafiscal ?? "",
			status: item.status,
			chave: item.chave ?? null,
			serie: item.serie ?? null,
			numero: item.numero ?? null,
			protocolo: item.protocolo ?? null,
		});
		if (
			item.idnotafiscal &&
			item.acao !== "erro" &&
			item.acao !== "conflito" &&
			item.acao !== "aguardando_venda"
		) {
			await marcarVendaNfceSincronizada(
				item.idvendalocal,
				item.atualizadoEm ?? resposta.servidorEm,
			);
		}
	}
}

function acumularResposta(
	resumo: ResumoReconciliacaoNfce,
	resposta: RespostaReconciliacaoNfcePdv,
): void {
	resumo.total += resposta.resumo.total;
	resumo.atualizadas +=
		resposta.resumo.atualizadas ??
		(resposta.resumo.sincronizadas ?? 0) + (resposta.resumo.reconciliadas ?? 0);
	resumo.registradas += resposta.resumo.registradas;
	resumo.conflitos += resposta.resumo.conflitos;
	resumo.falhas += resposta.resumo.falhas ?? resposta.resumo.erros ?? 0;
}

async function executarReconciliacao(): Promise<ResumoReconciliacaoNfce> {
	const cicloId = uuidv4();
	const vazio: ResumoReconciliacaoNfce = {
		cicloId,
		total: 0,
		atualizadas: 0,
		registradas: 0,
		conflitos: 0,
		falhas: 0,
		outboxProcessados: 0,
		outboxErros: 0,
	};

	if ((await getConfig("pdv_modo", "principal")) === "secundario") return vazio;
	const sessao = await obterSessao();
	if (!sessao.idempresa || !sessao.token || !(await pingApi())) return vazio;

	try {
		const outbox = await processarOutbox();
		vazio.outboxProcessados = outbox.processados;
		vazio.outboxErros = outbox.erros;

		const numeropdv = Math.max(
			1,
			Number(await getConfig("numeropdv", "1")) || 1,
		);
		const candidatas = await listarVendasCandidatasReconciliacaoNfce();
		const manifestos: ManifestoNfcePdv[] = candidatas.map((venda) => ({
			idvendalocal: venda.id,
			...(venda.idremoto ? { idvendaremoto: venda.idremoto } : {}),
			...(venda.idnfce ? { idnotafiscal: venda.idnfce } : {}),
			statusLocal: venda.nfce_status,
			...(venda.chave ? { chave: venda.chave } : {}),
			...(venda.serie != null ? { serie: venda.serie } : {}),
			...(venda.numero != null ? { numero: venda.numero } : {}),
			...(venda.protocolo ? { protocolo: venda.protocolo } : {}),
			...(venda.xml ? { xml: venda.xml } : {}),
			...(venda.motivo_contingencia
				? { motivoContingencia: venda.motivo_contingencia }
				: {}),
			...(venda.data_contingencia
				? { dataContingencia: venda.data_contingencia }
				: {}),
		}));
		const lotes = emLotesPorTamanho(manifestos);
		if (!lotes.length) lotes.push([]);
		let cursor = (await obterSyncMeta("nfce_sync_cursor")) ?? "";
		let primeiroLote = true;

		for (const lote of lotes) {
			const cursorDaRequisicao =
				primeiroLote && cursor ? cursorComSobreposicao(cursor) : cursor;
			const resposta = await reconciliarNfcePdv({
				idempresa: sessao.idempresa,
				numeropdv,
				cicloId,
				...(cursorDaRequisicao ? { cursor: cursorDaRequisicao } : {}),
				limite: 50,
				notas: lote,
			});
			await aplicarResposta(resposta);
			acumularResposta(vazio, resposta);
			cursor = resposta.proximoCursor ?? "";
			primeiroLote = false;
			await salvarMeta("nfce_sync_cursor", cursor);
		}

		let paginasDelta = 0;
		while (cursor && !cursor.endsWith("|") && paginasDelta < 100) {
			const resposta = await reconciliarNfcePdv({
				idempresa: sessao.idempresa,
				numeropdv,
				cicloId,
				cursor,
				limite: 50,
				notas: [],
			});
			await aplicarResposta(resposta);
			acumularResposta(vazio, resposta);
			cursor = resposta.proximoCursor ?? "";
			await salvarMeta("nfce_sync_cursor", cursor);
			paginasDelta += 1;
		}

		await salvarMeta("nfce_sync_ultima_ok", new Date().toISOString());
		await salvarMeta("nfce_sync_ultimo_erro", "");
		await salvarMeta("nfce_sync_ultimo_resumo", JSON.stringify(vazio));
		return vazio;
	} catch (err) {
		const mensagem =
			err instanceof Error ? err.message : "Falha ao reconciliar NFC-e";
		await salvarMeta("nfce_sync_ultimo_erro", mensagem).catch(() => undefined);
		throw err;
	}
}

export function reconciliarNfce(): Promise<ResumoReconciliacaoNfce> {
	if (cicloEmAndamento) return cicloEmAndamento;
	cicloEmAndamento = executarReconciliacao().finally(() => {
		cicloEmAndamento = null;
	});
	return cicloEmAndamento;
}

export function iniciarReconciliacaoNfcePeriodica(
	intervaloMs = 60_000,
	jitterMs = 5_000,
): { parar: () => void } {
	let timer: NodeJS.Timeout | null = null;
	let parado = false;
	const agendar = () => {
		if (parado) return;
		const jitter = Math.round((Math.random() * 2 - 1) * jitterMs);
		timer = setTimeout(
			async () => {
				await reconciliarNfce().catch(() => undefined);
				agendar();
			},
			Math.max(1_000, intervaloMs + jitter),
		);
	};
	agendar();
	return {
		parar: () => {
			parado = true;
			if (timer) clearTimeout(timer);
		},
	};
}
