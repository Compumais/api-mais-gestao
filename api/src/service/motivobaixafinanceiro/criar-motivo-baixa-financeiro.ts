import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model";
import type {
	MotivoBaixaFinanceiro,
	NovoMotivoBaixaFinanceiro,
} from "@/model/motivo-baixa-financeiro-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import {
	criarMotivoBaixaFinanceiro,
	excluirMotivoBaixaFinanceiro,
} from "@/repositories/motivo-baixa-financeiro-repositories";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria";
import { httpCriacao, httpErroInterno, httpProibido } from "@/util/http-util";

export async function criarMotivoBaixaFinanceiroService(
	idusuario: string,
	dados: NovoMotivoBaixaFinanceiro,
): Promise<HttpResponse<MotivoBaixaFinanceiro>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dados.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const motivoBaixaFinanceiro = await criarMotivoBaixaFinanceiro(dados);

	if (!motivoBaixaFinanceiro) {
		return httpErroInterno();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_motivo_baixa_financeiro",
		idusuario,
		recurso: "motivo_baixa_financeiro",
		idrecurso: motivoBaixaFinanceiro.id,
		idempresa: dados.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: motivoBaixaFinanceiro.descricao,
			inativo: motivoBaixaFinanceiro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirMotivoBaixaFinanceiro(motivoBaixaFinanceiro.id);
		return httpErroInterno();
	}

	return httpCriacao<MotivoBaixaFinanceiro>(motivoBaixaFinanceiro);
}
