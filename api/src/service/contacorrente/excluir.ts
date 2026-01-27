import type { HttpResponse } from "@/model/http-model";
import {
	buscarContaCorrentePorId,
	excluirContaCorrente,
} from "@/repositories/conta-corrente-repositories";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util";

type ExcluirContaCorrenteParametros = {
	id: string;
	idusuario: string;
};

export async function excluirContaCorrenteService({
	id,
	idusuario,
}: ExcluirContaCorrenteParametros): Promise<HttpResponse<void>> {
	const contaCorrente = await buscarContaCorrentePorId({ id });

	if (!contaCorrente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		contaCorrente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const contaCorrenteExcluida = await excluirContaCorrente({ id });

	if (!contaCorrenteExcluida) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
