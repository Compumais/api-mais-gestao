import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarBandeiraCartaoPorId,
	excluirBandeiraCartao,
} from "@/repositories/bandeira-cartao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirBandeiraCartaoParametros = {
	bandeiraCartaoId: string;
	idusuario: string;
};

export async function excluirBandeiraCartaoService({
	bandeiraCartaoId,
	idusuario,
}: ExcluirBandeiraCartaoParametros): Promise<HttpResponse<null>> {
	const registro = await buscarBandeiraCartaoPorId(bandeiraCartaoId);

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

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "excluir_bandeira_cartao",
		idusuario,
		recurso: "bandeira_cartao",
		idrecurso: bandeiraCartaoId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			codigo: registro.codigo,
			inativo: registro.inativo,
		},
	});

	if (!auditoria?.success) {
		return httpErroInterno();
	}

	await excluirBandeiraCartao(bandeiraCartaoId);

	return httpSemConteudo();
}
