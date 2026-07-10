import { v4 as uuidv4 } from "uuid";
import type { DAV } from "@/model/dav-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarDav,
	buscarDavPorId,
} from "@/repositories/dav-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

const STATUS_CANCELADO = 3;

type CancelarDavParametros = {
	davId: string;
	idusuario: string;
	idempresa: string;
};

export async function cancelarDavService({
	davId,
	idusuario,
	idempresa,
}: CancelarDavParametros): Promise<HttpResponse<DAV>> {
	const registro = await buscarDavPorId(davId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	if (registro.idempresa !== idempresa) {
		return httpProibido();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (registro.idnotafiscal) {
		return httpBadRequest(
			"Não é possível cancelar um pedido já faturado com NF-e",
		);
	}

	if (registro.status === STATUS_CANCELADO) {
		return httpBadRequest("Pedido já está cancelado");
	}

	const agora = new Date();
	const atualizado = await atualizarDav(davId, {
		status: STATUS_CANCELADO,
		datacancelamento: agora.toISOString().slice(0, 10),
		idusuariocancelamento: idusuario,
	});

	if (!atualizado) {
		return httpErroInterno();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "cancelar_dav",
		idusuario,
		recurso: "dav",
		idrecurso: davId,
		idempresa,
		criadoem: agora.toISOString(),
		metadados: {
			codigo: registro.codigo,
		},
	}).catch(console.error);

	return httpOk(atualizado);
}
