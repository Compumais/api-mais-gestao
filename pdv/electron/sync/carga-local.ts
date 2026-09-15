import { obterSessao } from "../db/repos";
import { ehSecundario, puxarDoPrincipal } from "../pdv-secundario/servico";
import { puxarNfceDaRetaguarda } from "./nfce-retaguarda";
import { pullCatalogo } from "./outbox";

export type ResultadoCargaLocal = {
	ok: true;
	origem: "nuvem" | "principal";
	produtos: number;
	grupos: number;
	gruposGourmet: number;
	atalhos: number;
	clientes: number;
	bandeiras: number;
	meiosPagamento: number;
	acessoNegado?: boolean;
	/** True quando reaproveitou uma carga já em andamento. */
	reutilizado?: boolean;
};

let emAndamento: Promise<ResultadoCargaLocal> | null = null;

export function cargaLocalEmAndamento(): boolean {
	return emAndamento !== null;
}

/**
 * Mesma carga do botão "Carga local" (config). Deduplica chamadas concorrentes
 * reutilizando a Promise em andamento.
 */
export async function executarCargaLocal(): Promise<ResultadoCargaLocal> {
	if (emAndamento) {
		const atual = await emAndamento;
		return { ...atual, reutilizado: true };
	}

	emAndamento = realizarCargaLocal().finally(() => {
		emAndamento = null;
	});
	return emAndamento;
}

async function realizarCargaLocal(): Promise<ResultadoCargaLocal> {
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
		clientes: pull.clientes ?? 0,
		bandeiras: pull.bandeiras ?? 0,
		meiosPagamento: pull.meiosPagamento ?? 0,
		acessoNegado:
			"acessoNegado" in pull ? Boolean(pull.acessoNegado) : undefined,
	};
}
