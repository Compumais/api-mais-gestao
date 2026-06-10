import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarEnquatramentoIpiPorId,
	excluirEnquatramentoIpi,
} from "@/repositories/enquatramento-ipi-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirEnquatramentoIpiParametros = {
	enquatramentoIpiId: string;
	idusuario: string;
};

export async function excluirEnquatramentoIpiService({
	enquatramentoIpiId,
	idusuario,
}: ExcluirEnquatramentoIpiParametros): Promise<HttpResponse<null>> {
	const registro = await buscarEnquatramentoIpiPorId(enquatramentoIpiId);

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
		acao: "excluir_enquatramento_ipi",
		idusuario,
		recurso: "enquatramento_ipi",
		idrecurso: enquatramentoIpiId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirEnquatramentoIpi(enquatramentoIpiId);

	return httpSemConteudo();
}
