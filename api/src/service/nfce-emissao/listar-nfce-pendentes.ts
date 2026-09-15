import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNfceConfiguracaoPorEmpresa } from "@/repositories/nfce-configuracao-repositories.js";
import {
	listarNfcePorEmpresa,
	type NfceListagem,
	type OrdenarNfceCampo,
} from "@/repositories/nota-fiscal-repositories.js";
import { resolverAmbienteSefaz } from "@/util/ambiente-sefaz.js";
import { completarListagemNfce } from "@/util/completar-listagem-nfce.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarNfcePendentesParametros = {
	idusuario: string;
	idempresa: string;
	status?: number | undefined;
	numero?: string | undefined;
	chavenfe?: string | undefined;
	idvenda?: string | undefined;
	dataInicio?: string | undefined;
	dataFim?: string | undefined;
	ordenarPor?: OrdenarNfceCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

type ListarNfcePendentesResposta = {
	data: NfceListagem[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarNfcePendentesService({
	idusuario,
	idempresa,
	status,
	numero,
	chavenfe,
	idvenda,
	dataInicio,
	dataFim,
	ordenarPor,
	ordem,
	page = 1,
	limit = 20,
}: ListarNfcePendentesParametros): Promise<
	HttpResponse<ListarNfcePendentesResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const nfceConfig = await buscarNfceConfiguracaoPorEmpresa(idempresa);
	const tipoambientenfe = resolverAmbienteSefaz(nfceConfig?.ambiente);

	const resultado = await listarNfcePorEmpresa({
		idempresa,
		status,
		numero,
		chavenfe,
		idvenda,
		dataInicio,
		dataFim,
		ordenarPor,
		ordem,
		tipoambientenfe,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const notas = resultado.notas.map((nota) => {
		const { valortotalvenda, datacriacaovenda, ...listagem } = nota;
		return completarListagemNfce(listagem, {
			valortotal: valortotalvenda,
			datacriacao: datacriacaovenda,
		});
	});

	return httpOk({
		data: notas,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
}
