import { v4 as uuidv4 } from "uuid";
import type {
	CodigoReduzidoContaContabil,
	NovoCodigoReduzidoContaContabil,
} from "@/model/codigo-reduzido-conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	criarCodigoReduzidoContaContabil,
	excluirCodigoReduzidoContaContabil,
} from "@/repositories/codigo-reduzido-conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarCodigoReduzidoContaContabilParametros = {
	dadosCodigoReduzidoContaContabil: NovoCodigoReduzidoContaContabil;
	idusuario: string;
};

export async function criarCodigoReduzidoContaContabilService({
	dadosCodigoReduzidoContaContabil,
	idusuario,
}: CriarCodigoReduzidoContaContabilParametros): Promise<
	HttpResponse<CodigoReduzidoContaContabil | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosCodigoReduzidoContaContabil.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarCodigoReduzidoContaContabil(
		dadosCodigoReduzidoContaContabil,
	);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_codigo_reduzido_conta_contabil",
		idusuario,
		recurso: "codigo_reduzido_conta_contabil",
		idrecurso: registro.id,
		idempresa: dadosCodigoReduzidoContaContabil.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			id: registro.id,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirCodigoReduzidoContaContabil(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<CodigoReduzidoContaContabil>(registro);
}
