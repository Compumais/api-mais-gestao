import type { DestinatarioPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { buscarEntidadePorId } from "@/repositories/entidade-repositories.js";
import {
	normalizarIeParaNfe,
	resolverIndIeDestNfe,
} from "@/util/normalizar-ie-nfe.js";

type EntidadeDestinatario = {
	id: string;
	nome: string;
	razaosocial?: string | null;
	cnpjcpf?: string | null;
	inscricaoestadual?: string | null;
	indiedest?: number | null;
	endereco?: string | null;
	numeroendereco?: string | null;
	bairro?: string | null;
	cep?: string | null;
	idestado?: string | null;
	idcidade?: string | null;
	pais?: string | null;
};

export function montarDestinatarioDeEntidade(
	entidade: EntidadeDestinatario,
): DestinatarioPayloadNfe {
	const indIEDest = resolverIndIeDestNfe({
		inscricaoestadual: entidade.inscricaoestadual,
		indiedest: entidade.indiedest,
		cnpjcpf: entidade.cnpjcpf,
	});

	return {
		cnpjcpf: entidade.cnpjcpf ?? undefined,
		razaosocial: entidade.razaosocial ?? entidade.nome,
		ie: normalizarIeParaNfe(entidade.inscricaoestadual, indIEDest),
		logradouro: entidade.endereco ?? undefined,
		numero: entidade.numeroendereco ?? undefined,
		bairro: entidade.bairro ?? undefined,
		cep: entidade.cep ?? undefined,
		estado: entidade.idestado ?? undefined,
		codigomunicipioibge: entidade.idcidade ?? undefined,
		pais: entidade.pais ?? undefined,
		indIEDest,
	};
}

export async function montarDestinatarioPorIdentidade(
	identidade: string | null | undefined,
): Promise<{
	identidade?: string;
	destinatario?: DestinatarioPayloadNfe;
} | null> {
	if (!identidade) return null;

	const entidade = await buscarEntidadePorId(identidade);
	if (!entidade) return null;

	return {
		identidade: entidade.id,
		destinatario: montarDestinatarioDeEntidade(entidade),
	};
}
