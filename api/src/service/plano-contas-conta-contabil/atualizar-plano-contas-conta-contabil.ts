import { v4 as uuidv4 } from "uuid";
import type {
	PlanoContasContaContabil,
	NovoPlanoContasContaContabil,
} from "@/model/plano-contas-conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarPlanoContasContaContabilPorId,
	atualizarPlanoContasContaContabil,
} from "@/repositories/plano-contas-conta-contabil-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarPlanoContasContaContabilParametros = {
	planoContasContaContabilId: string;
	idusuario: string;
	dados: Partial<NovoPlanoContasContaContabil>;
};

export async function atualizarPlanoContasContaContabilService({
	planoContasContaContabilId,
	idusuario,
	dados,
}: AtualizarPlanoContasContaContabilParametros): Promise<
	HttpResponse<PlanoContasContaContabil | null>
> {
	const registroExistente = await buscarPlanoContasContaContabilPorId(
		planoContasContaContabilId,
	);

	if (!registroExistente) {
		return httpNaoEncontrado();
	}

	if (!registroExistente.idempresa) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registroExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registroAtualizado = await atualizarPlanoContasContaContabil(
		planoContasContaContabilId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_plano_contas_conta_contabil",
		idusuario,
		recurso: "plano_contas_conta_contabil",
		idrecurso: planoContasContaContabilId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<PlanoContasContaContabil>(registroAtualizado);
}
