import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { Locacao } from "@/model/locacao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarLocacaoPorIdEempresa,
	listarItensLocacao,
	persistirCancelamentoLocacao,
} from "@/repositories/locacao-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { ErroNegocioLocacao } from "@/util/locacao-erro.js";

export async function cancelarLocacaoService(parametros: {
	id: string;
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<Locacao | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		parametros.idusuario,
		parametros.idempresa,
	);
	if (!pertence) return httpProibido();

	const atual = await buscarLocacaoPorIdEempresa(
		parametros.id,
		parametros.idempresa,
	);
	if (!atual) return httpNaoEncontrado("Locação não encontrada");
	if (atual.locacao.situacao !== "aberta") {
		return httpBadRequest("Somente locação aberta pode ser cancelada");
	}

	const itens = await listarItensLocacao(atual.locacao.id);
	try {
		const registro = await persistirCancelamentoLocacao({
			id: atual.locacao.id,
			idsEquipamentos: itens.map((item) => item.item.idequipamento),
		});
		const auditoria = await criarAuditoriaService({
			id: uuidv4(),
			acao: "cancelar_locacao",
			idusuario: parametros.idusuario,
			recurso: "locacao",
			idrecurso: registro.id,
			idempresa: registro.idempresa,
			criadoem: new Date().toISOString(),
			metadados: { codigo: registro.codigo },
		});
		if (!auditoria.success) return httpErroInterno();
		return httpOk(registro);
	} catch (error) {
		if (error instanceof ErroNegocioLocacao)
			return httpBadRequest(error.message);
		throw error;
	}
}
