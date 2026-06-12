import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarNotaFiscalPorId,
	excluirNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirNotaFiscalParametros = {
	notaFiscalId: string;
	idusuario: string;
};

export async function excluirNotaFiscalService({
	notaFiscalId,
	idusuario,
}: ExcluirNotaFiscalParametros): Promise<HttpResponse<null>> {
	const registro = await buscarNotaFiscalPorId(notaFiscalId);

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
		acao: "excluir_nota_fiscal",
		idusuario,
		recurso: "nota_fiscal",
		idrecurso: notaFiscalId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			numero: registro.numero,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirNotaFiscal(notaFiscalId);

	return httpSemConteudo();
}
