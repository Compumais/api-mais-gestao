export type ConteudoEtiquetaBalanca = "preco" | "peso";

export type ConfigEtiquetaBalanca = {
	habilitada: boolean;
	prefixo: string;
	digitosCodigo: number;
	conteudo: ConteudoEtiquetaBalanca;
	centavos: boolean;
	indicadorUso: boolean;
};

export type EtiquetaBalancaParseada = {
	codigo: number;
	valorBruto: number;
	valor: number;
	indicador: string | null;
};

export const CONFIG_ETIQUETA_BALANCA_PADRAO: ConfigEtiquetaBalanca = {
	habilitada: false,
	prefixo: "2",
	digitosCodigo: 4,
	conteudo: "preco",
	centavos: true,
	indicadorUso: false,
};

const ID_UNIDADE_KG_SISTEMA = "a0000001-0000-4000-8000-000000000002";
const CODIGOS_KG = new Set([
	"kg",
	"kgs",
	"kilo",
	"kilos",
	"kilograma",
	"quilograma",
	"quilogramas",
]);

export function configEtiquetaDeMapa(
	cfg: Record<string, string | undefined>,
): ConfigEtiquetaBalanca {
	const digitos = Number(cfg.etiqueta_balanca_digitos_codigo ?? "4");
	return {
		habilitada: (cfg.etiqueta_balanca_habilitada ?? "0") === "1",
		prefixo:
			(cfg.etiqueta_balanca_prefixo ?? "2").replace(/\D/g, "").slice(0, 1) ||
			"2",
		digitosCodigo: digitos === 5 || digitos === 6 ? digitos : 4,
		conteudo: cfg.etiqueta_balanca_conteudo === "peso" ? "peso" : "preco",
		centavos: (cfg.etiqueta_balanca_centavos ?? "1") !== "0",
		indicadorUso: (cfg.etiqueta_balanca_indicador_uso ?? "0") === "1",
	};
}

export function dvEan13(dozeDigitos: string): string {
	let soma = 0;
	for (let i = 0; i < 12; i++) {
		const n = Number(dozeDigitos[i] ?? "0");
		soma += i % 2 === 0 ? n : n * 3;
	}
	return String((10 - (soma % 10)) % 10);
}

export function ean13Valido(codigo: string): boolean {
	const digitos = codigo.replace(/\D/g, "");
	if (digitos.length !== 13) return false;
	return dvEan13(digitos.slice(0, 12)) === digitos[12];
}

function tamanhoExtra(config: ConfigEtiquetaBalanca): number {
	if (config.indicadorUso) return 1;
	if (config.digitosCodigo === 4) return 1;
	return 0;
}

export function layoutEtiquetaVisual(config: ConfigEtiquetaBalanca): string {
	const extra = config.indicadorUso
		? "U"
		: config.digitosCodigo === 4
			? "0"
			: "";
	const valorLen = 13 - 1 - config.digitosCodigo - extra.length - 1;
	const marca = config.conteudo === "peso" ? "P" : "T";
	return `${config.prefixo}${"C".repeat(config.digitosCodigo)}${extra}${marca.repeat(Math.max(0, valorLen))}DV`;
}

export function montarEan13Etiqueta(
	config: ConfigEtiquetaBalanca,
	codigo: number,
	valor: number,
): string {
	const prefixo = config.prefixo;
	const plu = String(Math.max(0, Math.trunc(codigo)))
		.padStart(config.digitosCodigo, "0")
		.slice(-config.digitosCodigo);
	const extra = config.indicadorUso
		? "0"
		: config.digitosCodigo === 4
			? "0"
			: "";
	const valorLen = 13 - 1 - config.digitosCodigo - extra.length - 1;
	const bruto =
		config.conteudo === "preco" && config.centavos
			? Math.round(valor * 100)
			: config.conteudo === "peso"
				? Math.round(valor * 1000)
				: Math.round(valor);
	const campoValor = String(Math.max(0, bruto))
		.padStart(valorLen, "0")
		.slice(-valorLen);
	const doze = `${prefixo}${plu}${extra}${campoValor}`;
	return `${doze}${dvEan13(doze)}`;
}

export function parsearEtiquetaBalanca(
	lido: string,
	config: ConfigEtiquetaBalanca,
): EtiquetaBalancaParseada | null {
	if (!config.habilitada) return null;
	const digitos = lido.replace(/\D/g, "");
	if (digitos.length !== 12 && digitos.length !== 13) return null;
	if (!digitos.startsWith(config.prefixo)) return null;
	if (digitos.length === 13 && !ean13Valido(digitos)) return null;

	const payload = digitos.slice(0, 12);
	const extra = tamanhoExtra(config);
	const inicioCodigo = config.prefixo.length;
	const fimCodigo = inicioCodigo + config.digitosCodigo;
	const fimExtra = fimCodigo + extra;
	if (fimExtra >= 12) return null;

	const campoCodigo = payload.slice(inicioCodigo, fimCodigo);
	const campoExtra = extra ? payload.slice(fimCodigo, fimExtra) : "";
	const campoValor = payload.slice(fimExtra);
	const codigo = Number(campoCodigo);
	if (!Number.isInteger(codigo) || codigo < 1) return null;

	const valorBruto = Number(campoValor);
	if (!Number.isFinite(valorBruto) || valorBruto <= 0) return null;

	let valor = valorBruto;
	if (config.conteudo === "preco" && config.centavos) {
		valor = valorBruto / 100;
	} else if (config.conteudo === "peso") {
		valor = valorBruto / 1000;
	}

	return {
		codigo,
		valorBruto,
		valor: Math.round(valor * 1000) / 1000,
		indicador: campoExtra || null,
	};
}

export function produtoPareceKg(produto: {
	unidademedida?: string | null;
	idunidademedida?: string | null;
}): boolean {
	const id = (produto.idunidademedida ?? "").trim().toLowerCase();
	if (id === ID_UNIDADE_KG_SISTEMA) return true;
	const u = (produto.unidademedida ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
	return CODIGOS_KG.has(u);
}

export function montarLancamentoEtiqueta(
	produto: {
		preco: number;
		unidademedida?: string | null;
		idunidademedida?: string | null;
	},
	parse: EtiquetaBalancaParseada,
	config: ConfigEtiquetaBalanca,
): {
	quantidade: number;
	precounitario: number;
	precototal: number;
	pesado: boolean;
} {
	const precoCadastro = Number(produto.preco) || 0;

	if (config.conteudo === "peso") {
		const quantidade = parse.valor;
		const precototal = Math.round(quantidade * precoCadastro * 100) / 100;
		return {
			quantidade,
			precounitario: precoCadastro,
			precototal,
			pesado: true,
		};
	}

	const totalEtiqueta = Math.round(parse.valor * 100) / 100;
	const ehKg = produtoPareceKg(produto);
	if (ehKg && precoCadastro > 0) {
		const quantidade =
			Math.round((totalEtiqueta / precoCadastro) * 1000) / 1000;
		return {
			quantidade,
			precounitario: precoCadastro,
			precototal: totalEtiqueta,
			pesado: true,
		};
	}

	return {
		quantidade: 1,
		precounitario: totalEtiqueta,
		precototal: totalEtiqueta,
		pesado: false,
	};
}
