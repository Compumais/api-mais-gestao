import { v4 as uuidv4 } from "uuid";
import type {
	CentroCusto,
	NovoCentroCusto,
} from "@/model/centro-custo-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	criarCentroCusto,
	excluirCentroCusto,
} from "@/repositories/centro-custo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarCentroCustoParametros = {
	dadosCentroCusto: NovoCentroCusto;
	idusuario: string;
};

export async function criarCentroCustoService({
	dadosCentroCusto,
	idusuario,
}: CriarCentroCustoParametros): Promise<HttpResponse<CentroCusto | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosCentroCusto.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarCentroCusto(dadosCentroCusto);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_centro_custo",
		idusuario,
		recurso: "centro_custo",
		idrecurso: registro.id,
		idempresa: dadosCentroCusto.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirCentroCusto(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<CentroCusto>(registro);
}
