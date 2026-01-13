import { v4 as uuidv4 } from "uuid";
import type {
	ContaCorrenteLancamento,
	NovaContaCorrenteLancamento,
} from "@/model/conta-corrente-lancamento-model";
import type { HttpResponse } from "@/model/http-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/clientes-repositories";
import { criarContaCorrenteLancamento } from "@/repositories/conta-corrente-lancamento";
import { httpCriacao, httpNaoAutorizado } from "@/util/http-util";

export async function criarContaCorrenteLancamentoService(
	dados: NovaContaCorrenteLancamento,
	usuarioId: string,
	empresaId: string,
): Promise<HttpResponse<ContaCorrenteLancamento>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		usuarioId,
		empresaId,
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
