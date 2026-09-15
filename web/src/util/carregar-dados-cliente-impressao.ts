import type { Entidade } from "@/services/entidades.service";
import { entidadesService } from "@/services/entidades.service";
import { localidadesService } from "@/services/localidades.service";
import type { DadosClienteImpressao } from "@/util/renderizar-modelo-impressao-os";

export async function carregarDadosClienteImpressao(
	idcliente: string | null | undefined,
	fallback?: {
		nome?: string | null;
		cnpjcpf?: string | null;
	},
): Promise<DadosClienteImpressao | null> {
	if (!idcliente) {
		if (!fallback?.nome && !fallback?.cnpjcpf) return null;
		return {
			nome: fallback.nome ?? null,
			cnpjcpf: fallback.cnpjcpf ?? null,
		};
	}

	try {
		const entidade = await entidadesService.buscar(idcliente);
		return await montarDadosClienteImpressao(entidade, fallback);
	} catch {
		if (!fallback?.nome && !fallback?.cnpjcpf) return null;
		return {
			nome: fallback.nome ?? null,
			cnpjcpf: fallback.cnpjcpf ?? null,
		};
	}
}

async function montarDadosClienteImpressao(
	entidade: Entidade,
	fallback?: {
		nome?: string | null;
		cnpjcpf?: string | null;
	},
): Promise<DadosClienteImpressao> {
	let cidade: string | null = null;
	const uf = entidade.idestado?.trim() || null;

	if (entidade.idcidade && uf) {
		try {
			const { data: municipios } =
				await localidadesService.listarMunicipios(uf);
			cidade =
				municipios.find((m) => m.idcidade === entidade.idcidade)?.nome ??
				null;
		} catch {
			cidade = null;
		}
	}

	return {
		nome: entidade.nome || fallback?.nome || null,
		cnpjcpf: entidade.cnpjcpf || fallback?.cnpjcpf || null,
		inscricaoestadual: entidade.inscricaoestadual,
		telefone: entidade.telefone,
		email: entidade.email,
		endereco: entidade.endereco,
		numero: entidade.numeroendereco,
		complemento: entidade.complemento,
		bairro: entidade.bairro,
		cep: entidade.cep,
		cidade,
		uf,
	};
}
