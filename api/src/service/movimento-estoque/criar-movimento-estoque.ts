import type { HttpResponse } from "@/model/http-model.js";
import type {
	MovimentoEstoque,
	NovoMovimentoEstoque,
} from "@/model/movimento-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarMovimentoEstoque } from "@/repositories/movimento-estoque-repositories.js";
import { httpCriacao, httpErro, httpProibido } from "@/util/http-util.js";

type CriarMovimentoEstoqueParametros = {
	dadosMovimentoEstoque: NovoMovimentoEstoque;
	idusuario: string;
};

export async function criarMovimentoEstoqueService({
	dadosMovimentoEstoque,
	idusuario,
}: CriarMovimentoEstoqueParametros): Promise<
	HttpResponse<MovimentoEstoque | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosMovimentoEstoque.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarMovimentoEstoque(dadosMovimentoEstoque);

	if (!registro) {
		return httpErro();
	}

	return httpCriacao<MovimentoEstoque>(registro);
}

