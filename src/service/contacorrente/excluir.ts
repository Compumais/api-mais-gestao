import type { HttpResponse } from "@/model/http-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/clientes-repositories";
import {
	buscarContaCorrentePorId,
	excluirContaCorrente,
} from "@/repositories/conta-corrente-repositories";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util";

type ExcluirContaCorrenteParametros = {
	id: string;
	userId: string;
};

export async function excluirContaCorrenteService({
	id,
	userId,
}: ExcluirContaCorrenteParametros): Promise<HttpResponse<void>> {
	const contaCorrente = await buscarContaCorrentePorId({ id });

	if (!contaCorrente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		userId,
		contaCorrente.empresaId,
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
