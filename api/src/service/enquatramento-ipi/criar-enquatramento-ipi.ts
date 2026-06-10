import { v4 as uuidv4 } from "uuid";
import type {
	EnquatramentoIPI,
	NovoEnquatramentoIPI,
} from "@/model/enquantramento-ipi-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	criarEnquatramentoIpi,
	excluirEnquatramentoIpi,
} from "@/repositories/enquatramento-ipi-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarEnquatramentoIpiParametros = {
	dadosEnquatramentoIpi: NovoEnquatramentoIPI;
	idusuario: string;
};

export async function criarEnquatramentoIpiService({
	dadosEnquatramentoIpi,
	idusuario,
}: CriarEnquatramentoIpiParametros): Promise<
	HttpResponse<EnquatramentoIPI | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosEnquatramentoIpi.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarEnquatramentoIpi(dadosEnquatramentoIpi);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_enquatramento_ipi",
		idusuario,
		recurso: "enquatramento_ipi",
		idrecurso: registro.id,
		idempresa: dadosEnquatramentoIpi.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirEnquatramentoIpi(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<EnquatramentoIPI>(registro);
}
