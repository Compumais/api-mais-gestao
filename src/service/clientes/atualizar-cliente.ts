import type { Cliente } from "@/model/cliente-model";
import type { HttpResponse } from "@/model/http-model";
import {
	atualizarCliente,
	buscarClientePorId,
	verificarEmailTelefoneDuplicado,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/clientes-repositories";
import { httpNaoEncontrado, httpOk, httpProibido, httpRecursoExistente } from "@/util/http-util";

type AtualizarClienteParametros = {
	clienteId: string;
	userId: string;
	dados: {
		nome?: string | undefined;
		email?: string | null | undefined;
		telefone?: string | null | undefined;
		endereco?: string | null | undefined;
		cidade?: string | null | undefined;
		estado?: string | null | undefined;
		cep?: string | null | undefined;
		pais?: string | null | undefined;
	};
};

export async function atualizarClienteService({
	clienteId,
	userId,
	dados,
}: AtualizarClienteParametros): Promise<HttpResponse<Cliente | null>> {
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

	if (dados.email || dados.telefone) {
		const emailOuTelefoneDuplicado =
			await verificarEmailTelefoneDuplicado(
				clienteExistente.empresaId,
				dados.email ?? clienteExistente.email,
				dados.telefone ?? clienteExistente.telefone,
				clienteId,
			);

		if (emailOuTelefoneDuplicado) {
			return httpRecursoExistente();
		}
	}

	const clienteAtualizado = await atualizarCliente(clienteId, {
		...dados,
		atualizadoEm: new Date().toISOString(),
	});

	if (!clienteAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<Cliente>(clienteAtualizado);
}

