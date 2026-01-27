import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model";
import type { MotivoBaixaFinanceiro } from "@/model/motivo-baixa-financeiro-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { atualizarMotivoBaixaFinanceiro } from "@/repositories/motivo-baixa-financeiro-repositories";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util";

interface AtualizarMotivoBaixaFinanceiroParametros {
	id: string;
	idusuario: string;
	idempresa: string;
	dados: {
		inativo?: number | null | undefined;
	};
}

export async function atualizarMotivoBaixaFinanceiroService({
	id,
	dados,
	idusuario,
	idempresa,
}: AtualizarMotivoBaixaFinanceiroParametros): Promise<
	HttpResponse<MotivoBaixaFinanceiro>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const motivoBaixaFinanceiro = await atualizarMotivoBaixaFinanceiro(id, {
		inativo: dados.inativo,
	});

	if (!motivoBaixaFinanceiro) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_motivo_baixa_financeiro",
		idusuario,
		recurso: "motivo_baixa_financeiro",
		idrecurso: id,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<MotivoBaixaFinanceiro>(motivoBaixaFinanceiro);
}
