import type {
	ContaCorrente,
	NovaContaCorrente,
} from "@/model/conta-corrente-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { criarContaCorrente } from "@/repositories/conta-corrente-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpCriacao,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarContaCorrenteParametros = {
	usuarioId: string;
	dadosContaCorrente: NovaContaCorrente;
};

export async function criarContaCorrenteService({
	usuarioId,
	dadosContaCorrente,
}: CriarContaCorrenteParametros): Promise<HttpResponse<ContaCorrente>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		usuarioId,
		dadosContaCorrente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const contaCorrente = await criarContaCorrente(dadosContaCorrente);

	if (!contaCorrente) {
		return httpErroInterno();
	}

	return httpCriacao(contaCorrente);
}
