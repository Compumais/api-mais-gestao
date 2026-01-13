import type { Entidade, NovaEntidade } from "@/model/entidade-model";
import type { HttpResponse } from "@/model/http-model";
import {
	criarEntidade,
	verificarEmailTelefoneDuplicado,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories";
import {
	httpCriacao,
	httpErro,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util";

type CriarEntidadeParametros = {
	dadosEntidade: NovaEntidade;
	idusuario: string;
};

export async function criarEntidadeService({
	dadosEntidade,
	idusuario,
}: CriarEntidadeParametros): Promise<HttpResponse<Entidade | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosEntidade.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const emailOuTelefoneDuplicado = await verificarEmailTelefoneDuplicado(
		dadosEntidade.idempresa,
		dadosEntidade.email,
		dadosEntidade.telefone,
	);

	if (emailOuTelefoneDuplicado) {
		return httpRecursoExistente();
	}

	const entidade = await criarEntidade(dadosEntidade);

	if (!entidade) {
		return httpErro();
	}

	return httpCriacao<Entidade>(entidade);
}
