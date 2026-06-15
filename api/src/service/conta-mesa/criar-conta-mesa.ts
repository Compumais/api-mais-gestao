import { v4 as uuidv4 } from "uuid";
import type { ContaMesa, NovaContaMesa } from "@/model/conta-mesa-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarContaMesa,
	excluirContaMesa,
} from "@/repositories/conta-mesa-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarContaMesaParametros = {
	dadosContaMesa: NovaContaMesa;
	idusuario: string;
};

export async function criarContaMesaService({
	dadosContaMesa,
	idusuario,
}: CriarContaMesaParametros): Promise<HttpResponse<ContaMesa | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosContaMesa.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarContaMesa(dadosContaMesa);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_conta_mesa",
		idusuario,
		recurso: "conta_mesa",
		idrecurso: registro.id,
		idempresa: dadosContaMesa.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			numeromesa: registro.numeromesa,
			status: registro.status,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirContaMesa(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<ContaMesa>(registro);
}
