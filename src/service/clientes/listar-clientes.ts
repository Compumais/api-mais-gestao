import type { Cliente } from "@/model/cliente-model";
import type { HttpResponse } from "@/model/http-model";
import {
	buscarEmpresasDoUsuario,
	listarClientes,
} from "@/repositories/clientes-repositories";
import { httpOk } from "@/util/http-util";

type ListarClientesParametros = {
	userId: string;
	nome?: string | undefined;
	email?: string | undefined;
	telefone?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarClientesResposta = {
	data: Cliente[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarClientesService({
	userId,
	nome,
	email,
	telefone,
	page = 1,
	limit = 10,
}: ListarClientesParametros): Promise<HttpResponse<ListarClientesResposta>> {
	const empresaIds = await buscarEmpresasDoUsuario(userId);

	if (empresaIds.length === 0) {
		return httpOk<ListarClientesResposta>({
			data: [],
			paginacao: {
				page,
				limit,
				total: 0,
				totalPages: 0,
			},
		});
	}

	const { clientes, total } = await listarClientes({
		empresaIds,
		nome,
		email,
		telefone,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarClientesResposta>({
		data: clientes,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}
