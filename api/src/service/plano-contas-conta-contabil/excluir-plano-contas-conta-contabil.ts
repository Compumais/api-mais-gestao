import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarPlanoContasContaContabilPorId,
	excluirPlanoContasContaContabil,
} from "@/repositories/plano-contas-conta-contabil-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirPlanoContasContaContabilParametros = {
	planoContasContaContabilId: string;
	idusuario: string;
};

export async function excluirPlanoContasContaContabilService({
	planoContasContaContabilId,
	idusuario,
}: ExcluirPlanoContasContaContabilParametros): Promise<HttpResponse<null>> {
	const registro = await buscarPlanoContasContaContabilPorId(
		planoContasContaContabilId,
	);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "excluir_plano_contas_conta_contabil",
		idusuario,
		recurso: "plano_contas_conta_contabil",
		idrecurso: planoContasContaContabilId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			idplanocontas: registro.idplanocontas,
			idcontacontabil: registro.idcontacontabil,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirPlanoContasContaContabil(planoContasContaContabilId);

	return httpSemConteudo();
}
