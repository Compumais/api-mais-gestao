import type { HttpResponse } from "@/model/http-model.js";
import type { LocalEstoque, NovoLocalEstoque } from "@/model/local-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarLocalEstoque } from "@/repositories/local-estoque-repositories.js";
import {
	httpCriacao,
	httpErro,
	httpProibido,
} from "@/util/http-util.js";

type CriarLocalEstoqueParametros = {
	dadosLocalEstoque: NovoLocalEstoque;
	idusuario: string;
};

export async function criarLocalEstoqueService({
	dadosLocalEstoque,
	idusuario,
}: CriarLocalEstoqueParametros): Promise<HttpResponse<LocalEstoque | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosLocalEstoque.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarLocalEstoque(dadosLocalEstoque);

	if (!registro) {
		return httpErro();
	}

	return httpCriacao<LocalEstoque>(registro);
}
