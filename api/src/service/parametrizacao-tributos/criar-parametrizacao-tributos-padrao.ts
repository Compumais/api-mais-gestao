import type { ParametrizacaoTributos } from "@/repositories/parametrizacao-tributos-repositories.js";
import {
	criarParametrizacaoTributosEmLote,
	listarParametrizacaoTributos,
} from "@/repositories/parametrizacao-tributos-repositories.js";
import { normalizarCodigoCfop } from "@/util/parametrizacao-tributos-matching.js";
import { montarParametrizacaoTributosPadrao } from "@/util/parametrizacao-tributos-padrao.js";

export async function criarParametrizacaoTributosPadraoService(
	idempresa: string,
): Promise<ParametrizacaoTributos[]> {
	const registrosPadrao = await montarParametrizacaoTributosPadrao(idempresa);

	if (registrosPadrao.length === 0) {
		return [];
	}

	const { registros: existentes } = await listarParametrizacaoTributos({
		idempresa,
		page: 1,
		limit: 5000,
	});

	const cfopsJaCadastrados = new Set(
		existentes
			.map((registro) => normalizarCodigoCfop(registro.codigocfopentrada))
			.filter((codigo): codigo is string => Boolean(codigo)),
	);

	const faltantes = registrosPadrao.filter((registro) => {
		const codigo = normalizarCodigoCfop(registro.codigocfopentrada);
		return Boolean(codigo) && !cfopsJaCadastrados.has(codigo as string);
	});

	if (faltantes.length === 0) {
		return [];
	}

	const criados = await criarParametrizacaoTributosEmLote(faltantes);

	if (criados.length !== faltantes.length) {
		throw new Error("Erro ao criar parametrização tributária padrão da empresa");
	}

	return criados;
}
