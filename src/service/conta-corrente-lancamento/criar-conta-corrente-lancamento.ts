import type {
	ContaCorrenteLancamento,
	NovaContaCorrenteLancamento,
} from "@/model/conta-corrente-lancamento-model";
import type { HttpResponse } from "@/model/http-model";
import { criarContaCorrenteLancamento } from "@/repositories/conta-corrente-lancamento";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { httpCriacao, httpNaoAutorizado } from "@/util/http-util";

export async function criarContaCorrenteLancamentoService(
	dados: NovaContaCorrenteLancamento,
	usuarioId: string,
	idempresa: string,
): Promise<HttpResponse<ContaCorrenteLancamento>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		usuarioId,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpNaoAutorizado();
	}

	const contaCorrenteLancamento = await criarContaCorrenteLancamento({
		idusuario: usuarioId,
		...dados,
	});

	return httpCriacao(contaCorrenteLancamento);
}
