import type { Cliente } from "@/model/cliente-model";
import type { HttpResponse } from "@/model/http-model";
import {
	buscarClientePorId,
	excluirCliente,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/clientes-repositories";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util";

type ExcluirClienteParametros = {
	clienteId: string;
	userId: string;
};

export async function excluirClienteService({
	clienteId,
	userId,
}: ExcluirClienteParametros): Promise<HttpResponse<Cliente | null>> {
	const clienteExistente = await buscarClientePorId(clienteId);

	if (!clienteExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		userId,
		clienteExistente.empresaId,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const clienteExcluido = await excluirCliente(clienteId);

	if (!clienteExcluido) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
