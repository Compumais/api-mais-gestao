import { v4 as uuidv4 } from "uuid";
import type {
	PlanoContasContaContabil,
	NovoPlanoContasContaContabil,
} from "@/model/plano-contas-conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarPlanoContasContaContabil,
	excluirPlanoContasContaContabil,
} from "@/repositories/plano-contas-conta-contabil-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarPlanoContasContaContabilParametros = {
	dadosPlanoContasContaContabil: NovoPlanoContasContaContabil;
	idusuario: string;
};

export async function criarPlanoContasContaContabilService({
	dadosPlanoContasContaContabil,
	idusuario,
}: CriarPlanoContasContaContabilParametros): Promise<
	HttpResponse<PlanoContasContaContabil | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosPlanoContasContaContabil.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarPlanoContasContaContabil(
		dadosPlanoContasContaContabil,
	);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_plano_contas_conta_contabil",
		idusuario,
		recurso: "plano_contas_conta_contabil",
		idrecurso: registro.id,
		idempresa: dadosPlanoContasContaContabil.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			idplanocontas: registro.idplanocontas,
			idcontacontabil: registro.idcontacontabil,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirPlanoContasContaContabil(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<PlanoContasContaContabil>(registro);
}
