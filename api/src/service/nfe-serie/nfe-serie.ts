import { v4 as uuidv4 } from "uuid";
import type { NfeSerie } from "@/model/nfe-emissao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNfceConfiguracaoPorEmpresa } from "@/repositories/nfce-configuracao-repositories.js";
import { buscarNfeConfiguracaoPorEmpresa } from "@/repositories/nfe-configuracao-repositories.js";
import { atualizarNfceConfiguracao } from "@/repositories/nfce-configuracao-repositories.js";
import { atualizarNfeConfiguracao } from "@/repositories/nfe-configuracao-repositories.js";
import { contarNotasFiscaisPorSerie } from "@/repositories/nota-fiscal-repositories.js";
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
	numeroproximo?: number;
	padrao?: boolean;
	ativo?: boolean;
};

export async function listarNfeSeriesService({
	idempresa,
	idusuario,
	modelo,
}: ParametrosBase & { modelo?: string }): Promise<HttpResponse<{ data: NfeSerie[] }>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const data = await listarNfeSeriesPorEmpresa(idempresa, modelo);
	return httpOk({ data });
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
	const duplicado = await buscarNfeSerieDuplicada(
		idempresa,
		modelo,
		dados.serie,
	);

	if (duplicado) {
		return httpRecursoExistente();
	}

	const agora = new Date().toISOString();
	const padrao = dados.padrao ?? false;

	if (padrao) {
		await desmarcarSeriesPadrao(idempresa, modelo);
	}

	const registro = await criarNfeSerie({
		id: uuidv4(),
		idempresa,
		modelo,
		serie: dados.serie,
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
		);
		const proximaPadrao = restantes.find((serie) => serie.ativo) ?? restantes[0];
		if (proximaPadrao) {
			await atualizarNfeSerie(proximaPadrao.id, {
				padrao: true,
				atualizadoem: agora,
			});
		}
	}

	return httpSemConteudo();
}
