import {
	atualizarNfceLocalCampos,
	avancarNumeracaoNfceAposEmissao,
	cancelarOutboxTransmitirContingenciaPendente,
	listarNfceLocalParaConflitoNumeracao,
	obterNfcePorVenda,
	obterVenda,
} from "../db/repos";
import { execute, query } from "../db/database";
import { emitirContingencia } from "./contingencia";
import { classificarConflitosNumeracao } from "./numeracao-nfce";
import {
	marcarConflitosNumeracaoNfceLocal,
	sincronizarFiscalPdv,
} from "../sync/outbox";

/**
 * Reemite NFC-e de contingência órfã (conflito de numeração) com novo nNF.
 * Mantém o XML antigo marcado como conflito_numeracao para auditoria.
 */
export async function reemitirContingenciaComNovaNumeracao(params: {
	idvenda: string;
	motivo?: string;
}): Promise<{
	modo: "contingencia" | "online" | "erro";
	mensagem: string;
	chave?: string;
	numeroAnterior?: number;
	numeroNovo?: number;
	serie?: number;
}> {
	const venda = await obterVenda(params.idvenda);
	if (!venda) {
		return { modo: "erro", mensagem: "Venda não encontrada" };
	}

	const nfce = await obterNfcePorVenda(params.idvenda);
	if (!nfce) {
		return {
			modo: "erro",
			mensagem: "Não há NFC-e local nesta venda para reemitir",
		};
	}

	if (nfce.status === "autorizada" || nfce.status === "transmitida") {
		return {
			modo: "erro",
			mensagem:
				"NFC-e já autorizada/transmitida — não reemita com nova numeração",
		};
	}

	if (
		nfce.status !== "conflito_numeracao" &&
		nfce.status !== "contingencia" &&
		nfce.status !== "pendente_contingencia" &&
		nfce.status !== "pendente" &&
		nfce.status !== "erro" &&
		nfce.status !== "erro_config"
	) {
		return {
			modo: "erro",
			mensagem: `Status ${nfce.status} não permite reemissão com nova numeração`,
		};
	}

	const numeroAnterior = nfce.numero;
	const serieAnterior = nfce.serie;
	const idNfceAnterior = nfce.id;

	try {
		await sincronizarFiscalPdv().catch(() => undefined);
		await cancelarOutboxTransmitirContingenciaPendente(params.idvenda);
		await atualizarNfceLocalCampos(idNfceAnterior, {
			status: "conflito_numeracao",
		});

		await execute(
			`UPDATE venda SET idnfce_local = NULL, nfce_status = 'pendente' WHERE id = $1`,
			[params.idvenda],
		);

		const motivo =
			params.motivo?.trim() ||
			`Reemissão por conflito de numeração (nNF ${numeroAnterior} série ${serieAnterior} já utilizado)`;

		const resultado = await emitirContingencia(params.idvenda, motivo, {
			forcarNovaNumeracao: true,
			silenciarImpressao: true,
		});

		if (resultado.modo === "online") {
			return {
				modo: "online",
				mensagem: resultado.mensagem,
				chave: resultado.chave,
				numeroAnterior,
				serie: serieAnterior,
			};
		}

		if (resultado.modo !== "contingencia") {
			await execute(
				`UPDATE venda SET idnfce_local = $1, nfce_status = 'conflito_numeracao' WHERE id = $2`,
				[idNfceAnterior, params.idvenda],
			);
			return {
				modo: "erro",
				mensagem: resultado.mensagem || "Falha ao reemitir contingência",
				numeroAnterior,
				serie: serieAnterior,
			};
		}

		const nova = await obterNfcePorVenda(params.idvenda);
		if (nova && nova.numero >= 1) {
			await avancarNumeracaoNfceAposEmissao(nova.serie, nova.numero);
		}

		return {
			modo: "contingencia",
			mensagem: `NFC-e reemitida: nNF ${numeroAnterior} → ${nova?.numero ?? "?"} (série ${nova?.serie ?? serieAnterior}). Reimprima o DANFC-e.`,
			chave: resultado.chave ?? nova?.chave ?? undefined,
			numeroAnterior,
			numeroNovo: nova?.numero,
			serie: nova?.serie ?? serieAnterior,
		};
	} catch (err) {
		await execute(
			`UPDATE venda SET idnfce_local = $1, nfce_status = 'conflito_numeracao' WHERE id = $2`,
			[idNfceAnterior, params.idvenda],
		).catch(() => undefined);
		return {
			modo: "erro",
			mensagem:
				err instanceof Error
					? err.message
					: "Falha ao reemitir com nova numeração",
			numeroAnterior,
			serie: serieAnterior,
		};
	}
}

/** Lista conflitos de numeração locais (após marcar órfãos). */
export async function listarConflitosNumeracaoNfceUi(): Promise<
	Array<{
		serie: number;
		numero: number;
		idsOrfaos: string[];
		vendas: Array<{
			idnfce: string;
			idvenda: string;
			chave: string | null;
			status: string;
			tpemis: number;
		}>;
	}>
> {
	await marcarConflitosNumeracaoNfceLocal();
	const registros = await listarNfceLocalParaConflitoNumeracao();
	const comConflito = await query<{
		id: string;
		idvenda: string;
		serie: number;
		numero: number;
		chave: string | null;
		status: string;
		tpemis: number;
		criadoem: string;
	}>(
		`SELECT id, idvenda, serie, numero, chave, status, tpemis, criadoem
		 FROM nfce_local
		 WHERE status = 'conflito_numeracao'
		    OR (serie, numero) IN (
				SELECT serie, numero FROM nfce_local
				WHERE status NOT IN ('cancelada', 'inutilizada')
				GROUP BY serie, numero HAVING COUNT(*) > 1
			)
		 ORDER BY serie, numero, criadoem`,
	);

	const conflitos = classificarConflitosNumeracao(
		comConflito.length ? comConflito : registros,
	);

	return conflitos.map((c) => ({
		serie: c.serie,
		numero: c.numero,
		idsOrfaos: c.idsOrfaos,
		vendas: c.nfces.map((n) => ({
			idnfce: n.id,
			idvenda: n.idvenda,
			chave: n.chave,
			status: n.status,
			tpemis: n.tpemis,
		})),
	}));
}
