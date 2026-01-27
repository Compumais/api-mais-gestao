import type { Financeiro, NovoFinanceiro } from "@/model/financeiro-model";
import type { HttpResponse } from "@/model/http-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { criarFinanceiro as criarFinanceiroRepository } from "@/repositories/financeiro-repositories";
import { httpCriacao, httpErro, httpProibido } from "@/util/http-util";

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
