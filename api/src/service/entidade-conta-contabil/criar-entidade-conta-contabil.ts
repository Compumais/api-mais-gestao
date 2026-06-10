import { v4 as uuidv4 } from "uuid";
import type {
	EntidadeContaContabil,
	NovoEntidadeContaContabil,
} from "@/model/entidade-conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	criarEntidadeContaContabil,
	excluirEntidadeContaContabil,
} from "@/repositories/entidade-conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarEntidadeContaContabilParametros = {
	dadosEntidadeContaContabil: NovoEntidadeContaContabil;
	idusuario: string;
};

export async function criarEntidadeContaContabilService({
	dadosEntidadeContaContabil,
	idusuario,
}: CriarEntidadeContaContabilParametros): Promise<
	HttpResponse<EntidadeContaContabil | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosEntidadeContaContabil.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarEntidadeContaContabil(dadosEntidadeContaContabil);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_entidade_conta_contabil",
		idusuario,
		recurso: "entidade_conta_contabil",
		idrecurso: registro.id,
		idempresa: dadosEntidadeContaContabil.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			identidade: registro.identidade,
			idcontacontabil: registro.idcontacontabil,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirEntidadeContaContabil(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<EntidadeContaContabil>(registro);
}
