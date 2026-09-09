/**
 * Regras de numeração NFC-e local (contingência) alinhadas à retaguarda.
 * Funções puras testáveis — o I/O fica em repos / sync.
 */

/** Status locais que “ocupam” o número perante a SEFAZ / retaguarda. */
export const STATUS_NFCE_NUMERO_OCUPADO = new Set([
	"autorizada",
	"transmitida",
]);

/** Status de contingência/órfão elegíveis a conflito ou reemissão. */
export const STATUS_NFCE_CONTINGENCIA_ATIVA = new Set([
	"contingencia",
	"pendente_contingencia",
	"pendente",
]);

/**
 * Próximo número monotônico: nunca rebobina abaixo do remoto, do local atual
 * nem do maior nNF já gravado em nfce_local (+1).
 */
export function resolverProximoNumeroMonotonico(params: {
	remoto: number;
	localAtual: number;
	maxNumeroUsadoLocal: number | null;
}): number {
	const candidatos: number[] = [];
	for (const n of [params.remoto, params.localAtual]) {
		if (Number.isFinite(n) && n >= 1) {
			candidatos.push(Math.floor(n));
		}
	}
	if (
		params.maxNumeroUsadoLocal != null &&
		Number.isFinite(params.maxNumeroUsadoLocal) &&
		params.maxNumeroUsadoLocal >= 1
	) {
		candidatos.push(Math.floor(params.maxNumeroUsadoLocal) + 1);
	}
	if (candidatos.length === 0) {
		return 1;
	}
	return Math.max(...candidatos);
}

export type NfceNumeracaoResumo = {
	id: string;
	idvenda: string;
	serie: number;
	numero: number;
	chave: string | null;
	status: string;
	tpemis: number;
	criadoem: string;
};

export type ConflitoNumeracaoNfce = {
	serie: number;
	numero: number;
	nfces: NfceNumeracaoResumo[];
	/** IDs que devem ser marcados como conflito (não o “vencedor” autorizado). */
	idsOrfaos: string[];
};

/**
 * Agrupa por (série, número). Há conflito se houver >1 NFC-e no grupo.
 * Órfãos = todos que não estão autorizada/transmitida; se ninguém estiver,
 * todos exceto o mais recente ficam órfãos (o mais novo pode ser reemitido).
 */
export function classificarConflitosNumeracao(
	registros: NfceNumeracaoResumo[],
): ConflitoNumeracaoNfce[] {
	const porChave = new Map<string, NfceNumeracaoResumo[]>();
	for (const r of registros) {
		if (!Number.isFinite(r.serie) || !Number.isFinite(r.numero) || r.numero < 1) {
			continue;
		}
		const key = `${r.serie}:${r.numero}`;
		const lista = porChave.get(key) ?? [];
		lista.push(r);
		porChave.set(key, lista);
	}

	const conflitos: ConflitoNumeracaoNfce[] = [];
	for (const [, lista] of porChave) {
		if (lista.length < 2) continue;
		const ordenados = [...lista].sort((a, b) =>
			a.criadoem < b.criadoem ? -1 : a.criadoem > b.criadoem ? 1 : 0,
		);
		const ocupados = ordenados.filter((n) =>
			STATUS_NFCE_NUMERO_OCUPADO.has(n.status),
		);
		let idsOrfaos: string[];
		if (ocupados.length > 0) {
			const idsOcupados = new Set(ocupados.map((n) => n.id));
			idsOrfaos = ordenados
				.filter((n) => !idsOcupados.has(n.id))
				.map((n) => n.id);
		} else {
			const maisRecente = ordenados[ordenados.length - 1];
			idsOrfaos = ordenados
				.filter((n) => n.id !== maisRecente.id)
				.map((n) => n.id);
		}
		if (idsOrfaos.length === 0) continue;
		conflitos.push({
			serie: ordenados[0].serie,
			numero: ordenados[0].numero,
			nfces: ordenados,
			idsOrfaos,
		});
	}
	return conflitos;
}
