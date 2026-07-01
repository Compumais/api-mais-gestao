import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	FatorConversao,
	NovoFatorConversao,
} from "@/model/fator-conversao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarFatorConversao,
	excluirFatorConversao,
} from "@/repositories/fator-conversao-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarFatorConversaoParametros = {
	dadosFatorConversao: NovoFatorConversao;
	idusuario: string;
};

export async function criarFatorConversaoService({
	dadosFatorConversao,
	idusuario,
}: CriarFatorConversaoParametros): Promise<HttpResponse<FatorConversao | null>> {
	if (!dadosFatorConversao.idempresa) {
		return httpProibido();
	}

	const idempresa = dadosFatorConversao.idempresa;

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarFatorConversao({
		...dadosFatorConversao,
		idempresa,
		currenttimemillis: Date.now(),
	});

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_fator_conversao",
		idusuario,
		recurso: "fator_conversao",
		idrecurso: registro.id,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			fator: registro.fator,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirFatorConversao(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<FatorConversao>(registro);
}
