export type RegistroIbptParseado = {
	ncm: string;
	ex: string;
	aliquotaNacional: number;
	aliquotaImportado: number;
	aliquotaEstadual: number;
	aliquotaMunicipal: number;
	chave: string;
	fonte: string;
	versao?: string;
	vigenciaInicio?: string;
	vigenciaFim?: string;
};

export type ResultadoParseIbpt = {
	uf: string;
	chave: string;
	fonte: string;
	versao?: string;
	registros: RegistroIbptParseado[];
};

function paraNumero(valor: unknown): number {
	if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
	if (typeof valor !== "string") return 0;
	const normalizado = valor.replace(",", ".").trim();
	const numero = Number(normalizado);
	return Number.isFinite(numero) ? numero : 0;
}

function normalizarNcm(valor: unknown): string {
	const digitos = String(valor ?? "").replace(/\D/g, "");
	if (!digitos) return "";
	return digitos.padStart(8, "0").slice(0, 8);
}

function normalizarEx(valor: unknown): string {
	const texto = String(valor ?? "").trim();
	return texto || "0";
}

function mapearRegistroGenerico(
	item: Record<string, unknown>,
	ufFallback: string,
	meta: { chave?: string; fonte?: string; versao?: string },
): RegistroIbptParseado | null {
	const ncm = normalizarNcm(item.codigo ?? item.Codigo ?? item.ncm ?? item.NCM);
	if (ncm.length !== 8) return null;

	const chave = String(
		item.chave ?? item.Chave ?? meta.chave ?? "",
	).trim();
	if (!chave) return null;

	return {
		ncm,
		ex: normalizarEx(item.ex ?? item.EX ?? item.excecao ?? item.Excecao),
		aliquotaNacional: paraNumero(
			item.aliquotaNacionalFederal ??
				item.Nacional ??
				item.nacionalfederal ??
				item.nacionalFederal,
		),
		aliquotaImportado: paraNumero(
			item.aliquotaImportadosFederal ??
				item.Importado ??
				item.importadosfederal ??
				item.importadoFederal,
		),
		aliquotaEstadual: paraNumero(
			item.aliquotaEstadual ?? item.Estadual ?? item.estadual,
		),
		aliquotaMunicipal: paraNumero(
			item.aliquotaMunicipal ?? item.Municipal ?? item.municipal,
		),
		chave,
		fonte: String(
			item.fonte ?? item.Fonte ?? meta.fonte ?? "IBPT/empresometro.com.br",
		).trim(),
		versao: String(item.versao ?? item.Versao ?? meta.versao ?? "").trim() ||
			undefined,
		vigenciaInicio: String(
			item.vigenciaInicio ??
				item.VigenciaInicio ??
				item.vigenciainicio ??
				"",
		).trim() || undefined,
		vigenciaFim:
			String(
				item.vigenciaFim ?? item.VigenciaFim ?? item.vigenciafim ?? "",
			).trim() || undefined,
	};
}

function extrairArrayRegistros(payload: unknown): Record<string, unknown>[] {
	if (Array.isArray(payload)) {
		return payload.filter(
			(item): item is Record<string, unknown> =>
				!!item && typeof item === "object",
		);
	}

	if (!payload || typeof payload !== "object") return [];

	const objeto = payload as Record<string, unknown>;
	if (Array.isArray(objeto.dados)) {
		return objeto.dados.filter(
			(item): item is Record<string, unknown> =>
				!!item && typeof item === "object",
		);
	}
	if (Array.isArray(objeto.ncm)) {
		return objeto.ncm.filter(
			(item): item is Record<string, unknown> =>
				!!item && typeof item === "object",
		);
	}
	if (Array.isArray(objeto.NCM)) {
		return objeto.NCM.filter(
			(item): item is Record<string, unknown> =>
				!!item && typeof item === "object",
		);
	}

	return [];
}

export function parsearArquivoIbpt(
	conteudo: unknown,
	ufInformada?: string,
): ResultadoParseIbpt {
	const payload =
		typeof conteudo === "string" ? JSON.parse(conteudo) : conteudo;

	if (!payload || typeof payload !== "object") {
		throw new Error("Arquivo IBPT inválido");
	}

	const objeto = payload as Record<string, unknown>;
	const uf = String(
		ufInformada ?? objeto.uf ?? objeto.UF ?? objeto.Uf ?? "",
	)
		.trim()
		.toUpperCase();

	if (uf.length !== 2) {
		throw new Error("UF inválida no arquivo IBPT");
	}

	const meta = {
		chave: String(objeto.chave ?? objeto.Chave ?? objeto.versao ?? "").trim(),
		fonte: String(objeto.fonte ?? objeto.Fonte ?? "IBPT/empresometro.com.br"),
		versao: String(objeto.versao ?? objeto.Versao ?? "").trim() || undefined,
	};

	const itens = extrairArrayRegistros(payload);
	const registros: RegistroIbptParseado[] = [];

	for (const item of itens) {
		const registro = mapearRegistroGenerico(item, uf, meta);
		if (registro) registros.push(registro);
	}

	if (registros.length === 0) {
		throw new Error("Nenhum registro IBPT válido encontrado no arquivo");
	}

	const chave = registros[0]?.chave ?? meta.chave;
	if (!chave) {
		throw new Error("Chave IBPT não encontrada no arquivo");
	}

	return {
		uf,
		chave,
		fonte: registros[0]?.fonte ?? meta.fonte,
		versao: registros[0]?.versao ?? meta.versao,
		registros,
	};
}

export function origemProdutoEhImportado(origem: number | null | undefined): boolean {
	return origem === 6 || origem === 7;
}

export function formatarMoedaIbpt(valor: number): string {
	return valor.toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export function montarTextoTributosAproximadosIbpt(params: {
	totalFederal: number;
	totalEstadual: number;
	totalMunicipal: number;
	uf: string;
	chave: string;
	fonte?: string;
}): string {
	const partes: string[] = [];
	if (params.totalFederal > 0) {
		partes.push(`R$ ${formatarMoedaIbpt(params.totalFederal)} Federal`);
	}
	if (params.totalEstadual > 0) {
		partes.push(`R$ ${formatarMoedaIbpt(params.totalEstadual)} Estadual`);
	}
	if (params.totalMunicipal > 0) {
		partes.push(`R$ ${formatarMoedaIbpt(params.totalMunicipal)} Municipal`);
	}

	if (partes.length === 0) return "";

	const fonte = params.fonte?.trim() || "IBPT/empresometro.com.br";
	return `Trib aprox ${partes.join(" e ")} Fonte: ${fonte} ${params.uf.toUpperCase()} ${params.chave}`;
}
