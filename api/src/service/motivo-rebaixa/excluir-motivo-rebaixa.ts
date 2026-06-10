import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarMotivoRebaixaPorId,
	excluirMotivoRebaixa,
} from "@/repositories/motivo-rebaixa-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirMotivoRebaixaParametros = {
	motivoRebaixaId: string;
	idusuario: string;
};

export async function excluirMotivoRebaixaService({
	motivoRebaixaId,
	idusuario,
}: ExcluirMotivoRebaixaParametros): Promise<HttpResponse<null>> {
	const registro = await buscarMotivoRebaixaPorId(motivoRebaixaId);

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
		acao: "excluir_motivo_rebaixa",
		idusuario,
		recurso: "motivo_rebaixa",
		idrecurso: motivoRebaixaId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirMotivoRebaixa(motivoRebaixaId);

	return httpSemConteudo();
}
