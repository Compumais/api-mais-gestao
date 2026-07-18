/**
 * Depara CFOP saída (XML do emitente) → CFOP de entrada.
 * Base: planilha "PLANILHA DE CFOP" (mercadoria para revenda + frete + outras).
 *
 * Em conflitos entre finalidades (revenda / uso-consumo / ativo), prevalece
 * **revenda** — caso típico de NF de compra de mercadoria.
 */

export type FinalidadeCfopEntrada =
	| "revenda"
	| "uso_consumo"
	| "ativo"
	| "frete"
	| "outras";

/** Mapa principal (revenda) + códigos exclusivos de frete/outras. */
const DEPARA_REVENDA: Record<string, string> = {
	"5101": "1102",
	"5102": "1102",
	"5405": "1403",
	"5403": "1403",
	"5910": "1910",
	"6101": "2102",
	"6102": "2102",
	"6405": "2403",
	"6404": "2403",
	"6401": "2403",
};

const DEPARA_USO_CONSUMO: Record<string, string> = {
	"5101": "1556",
	"5102": "1556",
	"5405": "1407",
	"5403": "1407",
	"6101": "2556",
	"6102": "2556",
	"6405": "2407",
	"6404": "2407",
	"6401": "2407",
};

const DEPARA_ATIVO: Record<string, string> = {
	"5101": "1551",
	"5102": "1551",
	"5405": "1406",
	"5403": "1406",
	"6101": "2551",
	"6102": "2551",
	"6405": "2406",
	"6404": "2406",
	"6401": "2406",
};

const DEPARA_FRETE: Record<string, string> = {
	"5353": "1353",
	"5352": "1353",
	"6353": "2353",
	"6352": "2353",
};

const DEPARA_OUTRAS: Record<string, string> = {
	"5949": "1949",
	"6949": "2949",
};

function normalizarCodigo(codigo?: string | null): string {
	return (codigo ?? "").replace(/\D/g, "");
}

function mapaPorFinalidade(
	finalidade: FinalidadeCfopEntrada,
): Record<string, string> {
	switch (finalidade) {
		case "uso_consumo":
			return DEPARA_USO_CONSUMO;
		case "ativo":
			return DEPARA_ATIVO;
		case "frete":
			return DEPARA_FRETE;
		case "outras":
			return DEPARA_OUTRAS;
		default:
			return DEPARA_REVENDA;
	}
}

/**
 * Sugere CFOP de entrada a partir do CFOP do XML (saída do fornecedor).
 * Default: mercadoria para revenda; frete/outras cobertos por códigos exclusivos.
 */
export function sugerirCodigoCfopEntradaPorCfopXml(
	codigoCfopXml?: string | null,
	finalidade: FinalidadeCfopEntrada = "revenda",
): string | null {
	const saida = normalizarCodigo(codigoCfopXml);
	if (saida.length < 4) return null;

	const mapaFinalidade = mapaPorFinalidade(finalidade);
	if (mapaFinalidade[saida]) {
		return mapaFinalidade[saida];
	}

	// Códigos exclusivos de frete/outras mesmo quando a finalidade é revenda
	if (DEPARA_FRETE[saida]) return DEPARA_FRETE[saida];
	if (DEPARA_OUTRAS[saida]) return DEPARA_OUTRAS[saida];

	// Fallback genérico: 5xxx→1xxx, 6xxx→2xxx, 7xxx→3xxx (mesmo sufixo)
	const primeiro = saida[0];
	if (primeiro === "5") return `1${saida.slice(1)}`;
	if (primeiro === "6") return `2${saida.slice(1)}`;
	if (primeiro === "7") return `3${saida.slice(1)}`;

	return null;
}

/** Lista plana usada para seed/documentação (revenda + frete + outras). */
export function listarDeparaCfopEntradaPadrao(): Array<{
	codigoSaida: string;
	codigoEntrada: string;
	finalidade: FinalidadeCfopEntrada;
}> {
	const linhas: Array<{
		codigoSaida: string;
		codigoEntrada: string;
		finalidade: FinalidadeCfopEntrada;
	}> = [];

	for (const [codigoSaida, codigoEntrada] of Object.entries(DEPARA_REVENDA)) {
		linhas.push({ codigoSaida, codigoEntrada, finalidade: "revenda" });
	}
	for (const [codigoSaida, codigoEntrada] of Object.entries(DEPARA_FRETE)) {
		linhas.push({ codigoSaida, codigoEntrada, finalidade: "frete" });
	}
	for (const [codigoSaida, codigoEntrada] of Object.entries(DEPARA_OUTRAS)) {
		linhas.push({ codigoSaida, codigoEntrada, finalidade: "outras" });
	}

	return linhas;
}
