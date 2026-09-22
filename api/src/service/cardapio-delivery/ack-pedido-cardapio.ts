import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarPedidoCardapioDelivery,
	buscarPedidoCardapioPorId,
} from "@/repositories/cardapio-delivery-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type AckPedidoCardapioParametros = {
	id: string;
	idempresa: string;
	idusuario: string;
	sucesso: boolean;
	idcontamensalocal?: string | null;
	mensagemerro?: string | null;
};

export async function ackPedidoCardapioDeliveryService({
	id,
	idempresa,
	idusuario,
	sucesso,
	idcontamensalocal,
	mensagemerro,
}: AckPedidoCardapioParametros): Promise<
	HttpResponse<{ id: string; status: string }>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const pedido = await buscarPedidoCardapioPorId(id);
	if (!pedido || pedido.idempresa !== idempresa) {
		return httpNaoEncontrado("Pedido não encontrado");
	}

	if (pedido.status === "enviado_pdv" && sucesso) {
		return httpOk({ id: pedido.id, status: pedido.status });
	}

	if (!sucesso && !mensagemerro?.trim()) {
		return httpBadRequest("Informe o erro do ingest");
	}

	const atualizado = await atualizarPedidoCardapioDelivery(id, {
		status: sucesso ? "enviado_pdv" : "erro",
		idcontamensalocal: idcontamensalocal ?? pedido.idcontamensalocal,
		mensagemerro: sucesso ? null : mensagemerro?.trim() || "Falha no PDV",
		ackingestadoem: new Date().toISOString(),
		atualizadoem: new Date().toISOString(),
	});

	if (!atualizado) return httpNaoEncontrado();
	return httpOk({ id: atualizado.id, status: atualizado.status });
}
