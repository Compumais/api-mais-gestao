import type {
	ContaContabil,
	NovaContaContabil,
} from "@/model/conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarContaContabilPorCodigoReduzido,
	criarContaContabil,
} from "@/repositories/conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { normalizarCodigoReduzido } from "@/service/contacontabil/codigo-reduzido.js";
import {
	httpCriacao,
	httpErroInterno,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

type CriarContaContabilParametros = {
	idusuario: string;
	dadosContaContabil: Omit<
		NovaContaContabil,
		| "currenttimemillis"
		| "datacadastro"
		| "dataultimaalteracao"
		| "idusuariocadastro"
		| "idultimousuarioalteracao"
	>;
};

export async function criarContaContabilService({
	idusuario,
	dadosContaContabil,
}: CriarContaContabilParametros): Promise<HttpResponse<ContaContabil>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosContaContabil.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const codigoReduzido = normalizarCodigoReduzido(
		dadosContaContabil.codigoreduzido,
	);
	if (codigoReduzido) {
		const conflito = await buscarContaContabilPorCodigoReduzido(
			dadosContaContabil.idempresa,
			codigoReduzido,
		);
		if (conflito) {
			return httpRecursoExistente(
				"Já existe uma conta contábil com este código reduzido",
			);
		}
	}

	const agora = new Date().toISOString();

	const contaContabil = await criarContaContabil({
		...dadosContaContabil,
		codigoreduzido: codigoReduzido ?? null,
		currenttimemillis: Date.now(),
		datacadastro: agora,
		dataultimaalteracao: agora,
		idusuariocadastro: idusuario,
		idultimousuarioalteracao: idusuario,
	});

	if (!contaContabil) {
		return httpErroInterno();
	}

	return httpCriacao<ContaContabil>(contaContabil);
}
