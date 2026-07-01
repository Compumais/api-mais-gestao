import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarFatorConversaoPorId,
	excluirFatorConversao,
} from "@/repositories/fator-conversao-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirFatorConversaoParametros = {
	fatorConversaoId: string;
	idusuario: string;
};

export async function excluirFatorConversaoService({
	fatorConversaoId,
	idusuario,
}: ExcluirFatorConversaoParametros): Promise<HttpResponse<null>> {
	const registro = await buscarFatorConversaoPorId(fatorConversaoId);

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
		acao: "excluir_fator_conversao",
		idusuario,
		recurso: "fator_conversao",
		idrecurso: fatorConversaoId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			fator: registro.fator,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirFatorConversao(fatorConversaoId);

	return httpSemConteudo();
}
