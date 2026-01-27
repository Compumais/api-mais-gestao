import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import {
	buscarMotivoBaixaFinanceiroPorId,
	excluirMotivoBaixaFinanceiro,
} from "@/repositories/motivo-baixa-financeiro-repositories";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util";

interface ExcluirMotivoBaixaFinanceiroParametros {
	id: string;
	idusuario: string;
	idempresa: string;
}

export async function excluirMotivoBaixaFinanceiroService({
	id,
	idusuario,
	idempresa,
}: ExcluirMotivoBaixaFinanceiroParametros): Promise<HttpResponse<void>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const motivo = await buscarMotivoBaixaFinanceiroPorId(id);

	if (!motivo) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "excluir_motivo_baixa_financeiro",
		idusuario,
		recurso: "motivo_baixa_financeiro",
		idrecurso: id,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: motivo.descricao,
			inativo: motivo.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirMotivoBaixaFinanceiro(id);

	return httpSemConteudo();
}
