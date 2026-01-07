import type { Cliente, NovoCliente } from "@/model/cliente-model";
import type { HttpResponse } from "@/model/http-model";
import { criarCliente } from "@/repositories/clientes-repositories";
import { httpCriacao } from "@/util/http-util";

export async function criarClienteService(
	dadosCliente: NovoCliente,
): Promise<HttpResponse<Cliente | null>> {
	const cliente = await criarCliente(dadosCliente);

	if (!cliente) {
		throw new Error("Erro ao criar cliente");
	}

	return httpCriacao<Cliente>(cliente);
}
