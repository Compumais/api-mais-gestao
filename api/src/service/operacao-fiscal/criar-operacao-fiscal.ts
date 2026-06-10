import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovoOperacaoFiscal,
	OperacaoFiscal,
} from "@/model/operacao-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarOperacaoFiscal,
	excluirOperacaoFiscal,
} from "@/repositories/operacao-fiscal-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarOperacaoFiscalParametros = {
	dadosOperacaoFiscal: NovoOperacaoFiscal;
	idusuario: string;
};

export async function criarOperacaoFiscalService({
	dadosOperacaoFiscal,
	idusuario,
}: CriarOperacaoFiscalParametros): Promise<
	HttpResponse<OperacaoFiscal | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosOperacaoFiscal.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarOperacaoFiscal(dadosOperacaoFiscal);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_operacao_fiscal",
		idusuario,
		recurso: "operacao_fiscal",
		idrecurso: registro.id,
		idempresa: dadosOperacaoFiscal.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirOperacaoFiscal(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<OperacaoFiscal>(registro);
}
