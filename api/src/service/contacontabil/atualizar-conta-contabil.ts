import type {
	ContaContabil,
	NovaContaContabil,
} from "@/model/conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarContaContabil,
	buscarContaContabilPorCodigoReduzido,
	buscarContaContabilPorId,
} from "@/repositories/conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { normalizarCodigoReduzido } from "@/service/contacontabil/codigo-reduzido.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

type AtualizarContaContabilParametros = {
	id: string;
	idusuario: string;
	dados: Partial<NovaContaContabil>;
};

export async function atualizarContaContabilService({
	id,
	idusuario,
	dados,
}: AtualizarContaContabilParametros): Promise<HttpResponse<ContaContabil>> {
	const contaExistente = await buscarContaContabilPorId(id);

	if (!contaExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		contaExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const codigoReduzido = normalizarCodigoReduzido(dados.codigoreduzido);
	if (codigoReduzido) {
		const conflito = await buscarContaContabilPorCodigoReduzido(
			contaExistente.idempresa,
			codigoReduzido,
			id,
		);
		if (conflito) {
			return httpRecursoExistente(
				"Já existe uma conta contábil com este código reduzido",
			);
		}
	}

	const contaContabil = await atualizarContaContabil(id, {
		...dados,
		...(dados.codigoreduzido !== undefined
			? { codigoreduzido: codigoReduzido }
			: {}),
		dataultimaalteracao: new Date().toISOString(),
		idultimousuarioalteracao: idusuario,
		currenttimemillis: Date.now(),
	});

	if (!contaContabil) {
		return httpErroInterno();
	}

	return httpOk<ContaContabil>(contaContabil);
}
