import { v4 as uuidv4 } from "uuid";
import type {
	TipoDocumentoFinanceiro,
	NovoTipoDocumentoFinanceiro,
} from "@/model/tipo-documento-financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarTipoDocumentoFinanceiro,
	excluirTipoDocumentoFinanceiro,
} from "@/repositories/tipo-documento-financeiro-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarTipoDocumentoFinanceiroParametros = {
	dadosTipoDocumentoFinanceiro: NovoTipoDocumentoFinanceiro;
	idusuario: string;
};

export async function criarTipoDocumentoFinanceiroService({
	dadosTipoDocumentoFinanceiro,
	idusuario,
}: CriarTipoDocumentoFinanceiroParametros): Promise<
	HttpResponse<TipoDocumentoFinanceiro | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosTipoDocumentoFinanceiro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarTipoDocumentoFinanceiro(
		dadosTipoDocumentoFinanceiro,
	);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_tipo_documento_financeiro",
		idusuario,
		recurso: "tipo_documento_financeiro",
		idrecurso: registro.id,
		idempresa: dadosTipoDocumentoFinanceiro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirTipoDocumentoFinanceiro(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<TipoDocumentoFinanceiro>(registro);
}
