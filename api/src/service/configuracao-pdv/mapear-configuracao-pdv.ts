import type {
	ConfiguracaoPdv,
	ConfiguracaoPdvResposta,
} from "@/model/configuracao-pdv-model.js";

export function paraResposta(
	configuracao: ConfiguracaoPdv | undefined,
): ConfiguracaoPdvResposta {
	const digitos = configuracao?.etiquetabalancadigitoscodigo;
	const digitosCodigo = digitos === 5 || digitos === 6 ? digitos : 4;
	return {
		modeloAtendimento:
			configuracao?.modeloatendimento === "comanda" ? "comanda" : "mesa",
		etiqueta_balanca_habilitada:
			configuracao?.etiquetabalancahabilitada === 1 ? "1" : "0",
		etiqueta_balanca_prefixo:
			(configuracao?.etiquetabalancaprefixo ?? "2").replace(/\D/g, "").slice(0, 1) ||
			"2",
		etiqueta_balanca_digitos_codigo: String(digitosCodigo) as "4" | "5" | "6",
		etiqueta_balanca_conteudo:
			configuracao?.etiquetabalancaconteudo === "peso" ? "peso" : "preco",
		etiqueta_balanca_centavos:
			configuracao?.etiquetabalancacentavos === 0 ? "0" : "1",
		etiqueta_balanca_indicador_uso:
			configuracao?.etiquetabalancaindicadoruso === 1 ? "1" : "0",
	};
}
