import { v4 as uuidv4 } from "uuid";
import type { DAV, NovoDAV } from "@/model/dav-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { criarDav, excluirDav } from "@/repositories/dav-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarDavParametros = {
	dadosDav: NovoDAV;
	idusuario: string;
};

export async function criarDavService({
	dadosDav,
	idusuario,
}: CriarDavParametros): Promise<HttpResponse<DAV | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosDav.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarDav(dadosDav);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_dav",
		idusuario,
		recurso: "dav",
		idrecurso: registro.id,
		idempresa: dadosDav.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirDav(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<DAV>(registro);
}
