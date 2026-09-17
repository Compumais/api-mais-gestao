import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NfeSerie } from "@/model/nfe-emissao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNfceConfiguracao,
	buscarNfceConfiguracaoPorEmpresa,
} from "@/repositories/nfce-configuracao-repositories.js";
import {
	atualizarNfeConfiguracao,
	buscarNfeConfiguracaoPorEmpresa,
} from "@/repositories/nfe-configuracao-repositories.js";
import {
	atualizarNfeSerie,
	buscarNfeSerieDuplicada,
	buscarNfeSeriePorId,
	criarNfeSerie,
	desmarcarSeriesPadrao,
	excluirNfeSerie,
	listarNfeSeriesPorEmpresa,
} from "@/repositories/nfe-serie-repositories.js";
import {
	buscarUltimoNumeroPorSeries,
	contarNotasFiscaisPorSerie,
} from "@/repositories/nota-fiscal-repositories.js";
import { buscarTerminalPdvPorSerie } from "@/repositories/terminal-pdv-repositories.js";
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

export type NfeSerieBody = {
	modelo?: string;
	serie: string;
	ambiente?: 1 | 2;
	numeroproximo?: number;
	padrao?: boolean;
	ativo?: boolean;
};

export async function listarNfeSeriesService({
	idempresa,
	idusuario,
	modelo,
	ambiente = 1,
}: ParametrosBase & { modelo?: string; ambiente?: 1 | 2 }): Promise<
	HttpResponse<{ data: Array<NfeSerie & { ultimonumero: number | null }> }>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const data = await listarNfeSeriesPorEmpresa(idempresa, modelo, ambiente);
	const ultimos = await buscarUltimoNumeroPorSeries(
		data.map((serie) => serie.id),
	);
	return httpOk({
		data: data.map((serie) => ({
			...serie,
			ultimonumero: ultimos.get(serie.id) ?? null,
		})),
	});
}

export async function criarNfeSerieService({
	idempresa,
	idusuario,
	dados,
}: ParametrosBase & { dados: NfeSerieBody }): Promise<
	HttpResponse<NfeSerie | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const modelo = dados.modelo ?? "55";
	const ambiente = dados.ambiente ?? 1;
	const duplicado = await buscarNfeSerieDuplicada(
		idempresa,
		modelo,
		dados.serie,
		ambiente,
	);

	if (duplicado) {
		return httpRecursoExistente();
	}

	const agora = new Date().toISOString();
	const padrao = dados.padrao ?? false;

	if (padrao) {
		await desmarcarSeriesPadrao(idempresa, modelo, ambiente);
	}

	const registro = await criarNfeSerie({
		id: uuidv4(),
		idempresa,
		modelo,
		serie: dados.serie,
		ambiente,
		numeroproximo: dados.numeroproximo ?? 1,
		padrao,
		ativo: dados.ativo ?? true,
		criadoem: agora,
		atualizadoem: agora,
	});

	if (!registro) {
		return httpErro();
	}

	return httpCriacao<NfeSerie>(registro);
}

export async function atualizarNfeSerieService({
	id,
	idempresa,
	idusuario,
	dados,
}: ParametrosBase & { id: string; dados: Partial<NfeSerieBody> }): Promise<
	HttpResponse<NfeSerie | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const existente = await buscarNfeSeriePorId(id);
	if (!existente || existente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	if (dados.serie) {
		const duplicado = await buscarNfeSerieDuplicada(
			idempresa,
			dados.modelo ?? existente.modelo,
			dados.serie,
			dados.ambiente ?? existente.ambiente,
			id,
		);
		if (duplicado) {
			return httpRecursoExistente();
		}
	}

	if (dados.padrao) {
		await desmarcarSeriesPadrao(
			idempresa,
			dados.modelo ?? existente.modelo,
			dados.ambiente ?? existente.ambiente,
		);
	}

	const registro = await atualizarNfeSerie(id, {
		...dados,
		atualizadoem: new Date().toISOString(),
	});

	if (!registro) {
		return httpErro();
	}

	return httpOk<NfeSerie>(registro);
}

export async function excluirNfeSerieService({
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

	const existente = await buscarNfeSeriePorId(id);
	if (!existente || existente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	const terminalVinculado = await buscarTerminalPdvPorSerie(id);
	if (terminalVinculado) {
		return httpBadRequest(
			"Não é possível excluir uma série vinculada a um terminal PDV",
		);
	}

	const notasVinculadas = await contarNotasFiscaisPorSerie(id);
	if (notasVinculadas > 0) {
		return httpBadRequest(
			"Não é possível excluir uma série que já possui notas fiscais emitidas",
		);
	}

	const registro = await excluirNfeSerie(id);
	if (!registro) {
		return httpErro();
	}

	const agora = new Date().toISOString();
	const [nfeConfig, nfceConfig] = await Promise.all([
		buscarNfeConfiguracaoPorEmpresa(idempresa),
		buscarNfceConfiguracaoPorEmpresa(idempresa),
	]);

	if (nfeConfig?.ultimaidserie === id) {
		await atualizarNfeConfiguracao(nfeConfig.id, {
			ultimaidserie: null,
			atualizadoem: agora,
		});
	}

	if (nfceConfig?.ultimaidserie === id) {
		await atualizarNfceConfiguracao(nfceConfig.id, {
			ultimaidserie: null,
			atualizadoem: agora,
		});
	}

	if (existente.padrao) {
		const restantes = await listarNfeSeriesPorEmpresa(
			idempresa,
			existente.modelo,
			existente.ambiente,
		);
		const proximaPadrao =
			restantes.find((serie) => serie.ativo) ?? restantes[0];
		if (proximaPadrao) {
			await atualizarNfeSerie(proximaPadrao.id, {
				padrao: true,
				atualizadoem: agora,
			});
		}
	}

	return httpSemConteudo();
}
