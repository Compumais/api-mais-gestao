import type { Banco } from "@/model/banco-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarBanco,
	buscarBancoPorId,
} from "@/repositories/banco-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarBancoParametros = {
	id: string;
	idusuario: string;
	dados: {
		codigo?: string | undefined;
		nome?: string | undefined;
	};
};

export async function atualizarBancoService({
	id,
	idusuario,
	dados,
}: AtualizarBancoParametros): Promise<HttpResponse<Banco>> {
	const bancoExistente = await buscarBancoPorId(id);

	if (!bancoExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		bancoExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const bancoAtualizado = await atualizarBanco({
		id,
		dados: {
			...dados,
			currenttimemillis: Date.now(),
		},
	});

	if (!bancoAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<Banco>(bancoAtualizado);
}
