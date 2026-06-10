import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarDavPorId, excluirDav } from "@/repositories/dav-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirDavParametros = {
	davId: string;
	idusuario: string;
};

export async function excluirDavService({
	davId,
	idusuario,
}: ExcluirDavParametros): Promise<HttpResponse<null>> {
	const registro = await buscarDavPorId(davId);

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
		acao: "excluir_dav",
		idusuario,
		recurso: "dav",
		idrecurso: davId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirDav(davId);

	return httpSemConteudo();
}
