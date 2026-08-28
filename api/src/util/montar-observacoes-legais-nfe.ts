import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import {
	type ItemObservacaoLoteNfe,
	anexarRastrosInformacoesAdicionaisNfe,
} from "@/util/montar-observacoes-lotes-nfe.js";
import {
	montarLegendaSimplesNacionalNfe,
	textoJaContemLegendaSimples,
} from "@/util/montar-legenda-simples-nacional-nfe.js";
import type { ResultadoTributosAproximadosIbpt } from "@/service/nfe-emissao/calcular-tributos-aproximados-ibpt.js";

export const SECAO_TRIB_APROX_NFE = "--- Trib aprox ---";

function removerSecaoPorMarcador(
	texto: string | undefined,
	marcador: string,
): string {
	if (!texto?.trim()) return "";
	const indice = texto.indexOf(marcador);
	if (indice === -1) return texto.trim();
	return texto.slice(0, indice).trim();
}

function removerBlocosAutomaticos(texto?: string | null): string {
	let base = texto?.trim() ?? "";
	base = removerSecaoPorMarcador(base, SECAO_TRIB_APROX_NFE);

	if (textoJaContemLegendaSimples(base)) {
		const indice = base.toUpperCase().indexOf("DOCUMENTO EMITIDO POR ME OU EPP");
		if (indice > 0) {
			base = base.slice(0, indice).trim().replace(/[.;]\s*$/, "");
		}
	}

	const indiceTrib = base.toUpperCase().indexOf("TRIB APROX");
	if (indiceTrib > 0) {
		base = base.slice(0, indiceTrib).trim().replace(/[.;]\s*$/, "");
	}

	return base;
}

function anexarTexto(base: string, bloco: string, limite: number): string {
	if (!bloco.trim()) return base;
	if (!base.trim()) return bloco.slice(0, limite);
	const separador = base.endsWith(".") ? " " : ". ";
	const candidato = `${base}${separador}${bloco}`;
	return candidato.length <= limite
		? candidato
		: candidato.slice(0, limite).trimEnd();
}

export function montarObservacoesLegaisNfe(params: {
	informacoesAdicionais?: string;
	crt: number | null | undefined;
	itens: ItemPayloadNfe[];
	tributosIbpt?: Pick<
		ResultadoTributosAproximadosIbpt,
		"texto" | "totalAproximado"
	>;
	limite?: number;
}): {
	informacoesAdicionais?: string;
	textoUsuario: string;
	legendaSimples?: string;
	textoIbpt?: string;
} {
	const limite = params.limite ?? 2000;
	const textoUsuario = removerBlocosAutomaticos(params.informacoesAdicionais);

	const antesSimples = textoUsuario;
	const legenda = montarLegendaSimplesNacionalNfe({
		crt: params.crt,
		itens: params.itens,
	});
	let resultado = antesSimples;
	if (legenda && !textoJaContemLegendaSimples(antesSimples)) {
		resultado = anexarTexto(antesSimples, legenda, limite);
	}
	const legendaSimples =
		legenda && resultado !== antesSimples ? legenda : undefined;

	const textoIbpt =
		params.tributosIbpt?.texto &&
		(params.tributosIbpt.totalAproximado ?? 0) > 0
			? params.tributosIbpt.texto
			: undefined;

	if (textoIbpt && !resultado.toUpperCase().includes("TRIB APROX")) {
		resultado = anexarTexto(resultado, textoIbpt, limite);
	}

	const comLotes = anexarRastrosInformacoesAdicionaisNfe(
		resultado,
		params.itens as ItemObservacaoLoteNfe[],
		limite,
	);

	return {
		informacoesAdicionais: comLotes || undefined,
		textoUsuario,
		legendaSimples: legendaSimples || undefined,
		textoIbpt,
	};
}
