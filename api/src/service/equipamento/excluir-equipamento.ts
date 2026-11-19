import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarEquipamentoPorIdEempresa,
	excluirEquipamento,
} from "@/repositories/equipamento-repositories.js";
import { contarItensPorEquipamento } from "@/repositories/locacao-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

export async function excluirEquipamentoService(parametros: {
	id: string;
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		parametros.idusuario,
		parametros.idempresa,
	);
	if (!pertence) return httpProibido();

	const atual = await buscarEquipamentoPorIdEempresa(
		parametros.id,
		parametros.idempresa,
	);
	if (!atual) return httpNaoEncontrado("Equipamento não encontrado");
	if (atual.situacao === "alocado") {
		return httpBadRequest("Equipamento alocado não pode ser excluído");
	}
	const usos = await contarItensPorEquipamento(atual.id);
	if (usos > 0) {
		return httpBadRequest("Equipamento já utilizado em locação");
	}

	const removido = await excluirEquipamento(atual.id);
	if (!removido) return httpErroInterno();

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "excluir_equipamento",
		idusuario: parametros.idusuario,
		recurso: "equipamento",
		idrecurso: atual.id,
		idempresa: atual.idempresa,
		criadoem: new Date().toISOString(),
		metadados: { codigo: atual.codigo },
	});
	if (!auditoria.success) return httpErroInterno();
	return httpSemConteudo();
}
