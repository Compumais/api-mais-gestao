import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NfeSerie } from "@/model/nfe-emissao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarNfeSeriePorId,
	buscarNfeSeriePorNumeroSerie,
	contarNfeSeriesPorEmpresaModelo,
	criarNfeSerie,
	desmarcarSeriesPadrao,
} from "@/repositories/nfe-serie-repositories.js";
import { buscarUltimoNumeroPorSeries } from "@/repositories/nota-fiscal-repositories.js";
import {
	atualizarTerminalPdv,
	buscarTerminalPdvPorId,
	buscarTerminalPdvPorNumero,
	buscarTerminalPdvPorSerie,
	criarTerminalPdv,
	excluirTerminalPdv,
	listarTerminaisPdvPorEmpresa,
	type TerminalPdvComSerie,
} from "@/repositories/terminal-pdv-repositories.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErro,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpRecursoExistente,
	httpSemConteudo,
} from "@/util/http-util.js";

type ParametrosBase = {
	idempresa: string;
	idusuario: string;
};

export type TerminalPdvBody = {
	numeropdv: number;
	descricao?: string | null;
	idnfeserie?: string | null;
	ativo?: boolean;
};

function normalizarDescricao(valor?: string | null): string | null {
	const texto = valor?.trim();
	return texto ? texto.slice(0, 120) : null;
}

async function resolverSerieDoTerminal({
	idempresa,
	numeropdv,
	idnfeserie,
	excluirTerminalId,
}: {
	idempresa: string;
	numeropdv: number;
	idnfeserie?: string | null;
	excluirTerminalId?: string;
}): Promise<HttpResponse<never> | NfeSerie> {
	if (idnfeserie) {
		const serie = await buscarNfeSeriePorId(idnfeserie);
		if (!serie || serie.idempresa !== idempresa) {
			return httpNaoEncontrado();
		}
		if (serie.modelo !== "65") {
			return httpBadRequest("A série do PDV precisa ser modelo 65 (NFC-e)");
		}
		const ocupada = await buscarTerminalPdvPorSerie(serie.id);
		if (ocupada && ocupada.id !== excluirTerminalId) {
			return httpRecursoExistente(
				"Esta série NFC-e já está vinculada a outro PDV",
			);
		}
		return serie;
	}

	const numeroSerie = String(numeropdv);
	const existente = await buscarNfeSeriePorNumeroSerie(
		idempresa,
		"65",
		numeroSerie,
	);
	if (existente) {
		const ocupada = await buscarTerminalPdvPorSerie(existente.id);
		if (ocupada && ocupada.id !== excluirTerminalId) {
			return httpRecursoExistente(
				"Já existe um PDV usando a série igual a este número",
			);
		}
		return existente;
	}

	const totalModelo65 = await contarNfeSeriesPorEmpresaModelo(idempresa, "65");
	const padrao = totalModelo65 === 0;
	if (padrao) {
		await desmarcarSeriesPadrao(idempresa, "65");
	}

	const agora = new Date().toISOString();
	const criada = await criarNfeSerie({
		id: uuidv4(),
		idempresa,
		modelo: "65",
		serie: numeroSerie,
		numeroproximo: 1,
		padrao,
		ativo: true,
		criadoem: agora,
		atualizadoem: agora,
	});

	if (!criada) {
		return httpErro();
	}

	return criada;
}

async function hidratarTerminal(
	id: string,
): Promise<TerminalPdvComSerie | undefined> {
	return buscarTerminalPdvPorId(id);
}

export async function listarTerminaisPdvService({
	idempresa,
	idusuario,
}: ParametrosBase): Promise<
	HttpResponse<{
		data: Array<TerminalPdvComSerie & { ultimonumero: number | null }>;
	}>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const terminais = await listarTerminaisPdvPorEmpresa(idempresa);
	const ultimos = await buscarUltimoNumeroPorSeries(
		terminais.map((terminal) => terminal.idnfeserie),
	);
	const data = terminais.map((terminal) => ({
		...terminal,
		ultimonumero: ultimos.get(terminal.idnfeserie) ?? null,
	}));
	return httpOk({ data });
}

export async function criarTerminalPdvService({
	idempresa,
	idusuario,
	dados,
}: ParametrosBase & { dados: TerminalPdvBody }): Promise<
	HttpResponse<TerminalPdvComSerie | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const duplicado = await buscarTerminalPdvPorNumero(
		idempresa,
		dados.numeropdv,
	);
	if (duplicado) {
		return httpRecursoExistente(
			"Já existe um PDV com este número nesta empresa",
		);
	}

	const serie = await resolverSerieDoTerminal({
		idempresa,
		numeropdv: dados.numeropdv,
		idnfeserie: dados.idnfeserie,
	});
	if ("success" in serie) {
		return serie;
	}

	const agora = new Date().toISOString();
	const registro = await criarTerminalPdv({
		id: uuidv4(),
		idempresa,
		numeropdv: dados.numeropdv,
		descricao: normalizarDescricao(dados.descricao),
		idnfeserie: serie.id,
		ativo: dados.ativo ?? true,
		criadoem: agora,
		atualizadoem: agora,
	});

	if (!registro) {
		return httpErro();
	}

	const hidratado = await hidratarTerminal(registro.id);
	if (!hidratado) {
		return httpErro();
	}

	return httpCriacao(hidratado);
}

export async function atualizarTerminalPdvService({
	id,
	idempresa,
	idusuario,
	dados,
}: ParametrosBase & {
	id: string;
	dados: Partial<TerminalPdvBody>;
}): Promise<HttpResponse<TerminalPdvComSerie | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const existente = await buscarTerminalPdvPorId(id);
	if (!existente || existente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	if (
		dados.numeropdv !== undefined &&
		dados.numeropdv !== existente.numeropdv
	) {
		const duplicado = await buscarTerminalPdvPorNumero(
			idempresa,
			dados.numeropdv,
		);
		if (duplicado && duplicado.id !== id) {
			return httpRecursoExistente(
				"Já existe um PDV com este número nesta empresa",
			);
		}
	}

	const numeropdv = dados.numeropdv ?? existente.numeropdv;
	const idnfeserie =
		dados.idnfeserie === undefined ? existente.idnfeserie : dados.idnfeserie;

	const serie = await resolverSerieDoTerminal({
		idempresa,
		numeropdv,
		idnfeserie,
		excluirTerminalId: id,
	});
	if ("success" in serie) {
		return serie;
	}

	const registro = await atualizarTerminalPdv(id, {
		...(dados.numeropdv !== undefined ? { numeropdv: dados.numeropdv } : {}),
		...(dados.descricao !== undefined
			? { descricao: normalizarDescricao(dados.descricao) }
			: {}),
		idnfeserie: serie.id,
		...(dados.ativo !== undefined ? { ativo: dados.ativo } : {}),
		atualizadoem: new Date().toISOString(),
	});

	if (!registro) {
		return httpErro();
	}

	const hidratado = await hidratarTerminal(registro.id);
	if (!hidratado) {
		return httpErro();
	}

	return httpOk(hidratado);
}

export async function excluirTerminalPdvService({
	id,
	idempresa,
	idusuario,
}: ParametrosBase & { id: string }): Promise<HttpResponse<null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const existente = await buscarTerminalPdvPorId(id);
	if (!existente || existente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	const registro = await excluirTerminalPdv(id);
	if (!registro) {
		return httpErro();
	}

	return httpSemConteudo();
}
