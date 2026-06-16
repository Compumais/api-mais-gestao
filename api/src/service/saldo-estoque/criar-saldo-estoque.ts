import type { HttpResponse } from "@/model/http-model.js";
import type { NovoSaldoEstoque, SaldoEstoque } from "@/model/saldo-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarSaldoEstoque } from "@/repositories/saldo-estoque-repositories.js";
import {
	httpCriacao,
	httpErro,
	httpProibido,
} from "@/util/http-util.js";

type CriarSaldoEstoqueParametros = {
	dadosSaldoEstoque: NovoSaldoEstoque;
	idusuario: string;
};

export async function criarSaldoEstoqueService({
	dadosSaldoEstoque,
	idusuario,
}: CriarSaldoEstoqueParametros): Promise<HttpResponse<SaldoEstoque | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosSaldoEstoque.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarSaldoEstoque(dadosSaldoEstoque);

	if (!registro) {
		return httpErro();
	}

	return httpCriacao<SaldoEstoque>(registro);
}
