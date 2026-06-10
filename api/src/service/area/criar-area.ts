import { v4 as uuidv4 } from "uuid";
import type { Area, NovoArea } from "@/model/area-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { criarArea, excluirArea } from "@/repositories/area-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarAreaParametros = {
	dadosArea: NovoArea;
	idusuario: string;
};

export async function criarAreaService({
	dadosArea,
	idusuario,
}: CriarAreaParametros): Promise<HttpResponse<Area | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosArea.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarArea(dadosArea);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_area",
		idusuario,
		recurso: "area",
		idrecurso: registro.id,
		idempresa: dadosArea.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirArea(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<Area>(registro);
}
