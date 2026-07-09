import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NfseSerie } from "@/model/nfse-emissao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNfseSerie,
	buscarNfseSeriePorNumeroSerie,
	criarNfseSerie,
	listarNfseSeriesPorEmpresa,
} from "@/repositories/nfse-serie-repositories.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErro,
	httpOk,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

type ParametrosBase = {
	idempresa: string;
	idusuario: string;
};

export type NfseSerieBody = {
	serie: string;
	numeroproximo?: number;
	padrao?: boolean;
	ativo?: boolean;
};

export async function listarNfseSeriesService({
	idempresa,
	idusuario,
}: ParametrosBase): Promise<HttpResponse<{ data: NfseSerie[] }>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const data = await listarNfseSeriesPorEmpresa(idempresa);
	return httpOk({ data });
}

export async function criarNfseSerieService({
	idempresa,
	idusuario,
	dados,
}: ParametrosBase & { dados: NfseSerieBody }): Promise<
	HttpResponse<NfseSerie | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const duplicado = await buscarNfseSeriePorNumeroSerie(idempresa, dados.serie);
	if (duplicado) {
		return httpRecursoExistente();
	}

	const agora = new Date().toISOString();

	if (dados.padrao) {
		const series = await listarNfseSeriesPorEmpresa(idempresa);
		for (const serie of series) {
			if (serie.padrao) {
				await atualizarNfseSerie(serie.id, {
					padrao: false,
					atualizadoem: agora,
				});
			}
		}
	}

	const registro = await criarNfseSerie({
		id: uuidv4(),
		idempresa,
		serie: dados.serie,
		numeroproximo: dados.numeroproximo ?? 1,
		padrao: dados.padrao ?? false,
		ativo: dados.ativo ?? true,
		criadoem: agora,
		atualizadoem: agora,
	});

	if (!registro) {
		return httpErro();
	}

	return httpCriacao<NfseSerie>(registro);
}

export async function atualizarNfseSerieService({
	id,
	idempresa,
	idusuario,
	dados,
}: ParametrosBase & { id: string; dados: Partial<NfseSerieBody> }): Promise<
	HttpResponse<NfseSerie | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const agora = new Date().toISOString();

	if (dados.padrao) {
		const series = await listarNfseSeriesPorEmpresa(idempresa);
		for (const serie of series) {
			if (serie.padrao && serie.id !== id) {
				await atualizarNfseSerie(serie.id, {
					padrao: false,
					atualizadoem: agora,
				});
			}
		}
	}

	const registro = await atualizarNfseSerie(id, {
		...dados,
		atualizadoem: agora,
	});

	if (!registro) {
		return httpBadRequest("Série RPS não encontrada");
	}

	return httpOk<NfseSerie>(registro);
}
