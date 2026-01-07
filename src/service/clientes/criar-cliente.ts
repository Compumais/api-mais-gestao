import type { Cliente, NovoCliente } from "@/model/cliente-model";
import type { HttpResponse } from "@/model/http-model";
import {
	criarCliente,
	verificarEmailTelefoneDuplicado,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/clientes-repositories";
import {
	httpCriacao,
	httpErro,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util";

type CriarClienteParametros = {
	dadosCliente: NovoCliente;
	userId: string;
};

export async function criarClienteService({
	dadosCliente,
	userId,
}: CriarClienteParametros): Promise<HttpResponse<Cliente | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		userId,
		dadosCliente.empresaId,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const emailOuTelefoneDuplicado = await verificarEmailTelefoneDuplicado(
		dadosCliente.empresaId,
		dadosCliente.email,
		dadosCliente.telefone,
	);

	if (emailOuTelefoneDuplicado) {
		return httpRecursoExistente();
	}

	const cliente = await criarCliente(dadosCliente);

	if (!cliente) {
		return httpErro();
	}

	return httpCriacao<Cliente>(cliente);
}
