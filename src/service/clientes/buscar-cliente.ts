import type { Cliente } from "@/model/cliente-model";
import type { HttpResponse } from "@/model/http-model";
import {
	buscarClientePorId,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/clientes-repositories";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util";

type BuscarClienteParametros = {
	clienteId: string;
	userId: string;
};

export async function buscarClienteService({
	clienteId,
	userId,
}: BuscarClienteParametros): Promise<HttpResponse<Cliente | null>> {
	const cliente = await buscarClientePorId(clienteId);

	if (!cliente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		userId,
		cliente.empresaId,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<Cliente>(cliente);
}
