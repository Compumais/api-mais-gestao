import type { Financeiro, NovoFinanceiro } from "@/model/financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarFinanceiro as criarFinanceiroRepository } from "@/repositories/financeiro-repositories.js";
import { httpCriacao, httpErro, httpProibido } from "@/util/http-util.js";

type CriarFinanceiroParametros = {
	dadosFinanceiro: NovoFinanceiro;
	idusuario: string;
};

export async function criarFinanceiroService({
	dadosFinanceiro,
	idusuario,
}: CriarFinanceiroParametros): Promise<HttpResponse<Financeiro | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosFinanceiro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const financeiro = await criarFinanceiroRepository(dadosFinanceiro);

	if (!financeiro) {
		return httpErro();
	}

	return httpCriacao<Financeiro>(financeiro);
}
