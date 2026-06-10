import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	MotivoRebaixa,
	NovoMotivoRebaixa,
} from "@/model/motivo-rebaixa-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarMotivoRebaixa,
	excluirMotivoRebaixa,
} from "@/repositories/motivo-rebaixa-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarMotivoRebaixaParametros = {
	dadosMotivoRebaixa: NovoMotivoRebaixa;
	idusuario: string;
};

export async function criarMotivoRebaixaService({
	dadosMotivoRebaixa,
	idusuario,
}: CriarMotivoRebaixaParametros): Promise<HttpResponse<MotivoRebaixa | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosMotivoRebaixa.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarMotivoRebaixa(dadosMotivoRebaixa);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_motivo_rebaixa",
		idusuario,
		recurso: "motivo_rebaixa",
		idrecurso: registro.id,
		idempresa: dadosMotivoRebaixa.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirMotivoRebaixa(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<MotivoRebaixa>(registro);
}
