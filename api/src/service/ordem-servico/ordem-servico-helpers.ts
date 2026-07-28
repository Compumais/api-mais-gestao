import { v4 as uuidv4 } from "uuid";
import type { ConfiguracaoOrdemServico } from "@/model/configuracao-ordem-servico-model.js";
import {
	buscarConfiguracaoOrdemServicoPorEmpresa,
	criarConfiguracaoOrdemServico,
} from "@/repositories/configuracao-ordem-servico-repositories.js";
import {
	buscarTipoOrdemServicoEventoPorCodigo,
	criarTiposOrdemServicoEventoEmLote,
	listarTiposOrdemServicoEvento,
} from "@/repositories/tipo-ordem-servico-evento-repositories.js";
import {
	ORDEM_SERVICO_CAMPOS_EXTRA,
	ORDEM_SERVICO_STATUS_PADRAO,
	type OrdemServicoCampoExtra,
} from "@/util/ordem-servico-constants.js";

export type CampoExtraOrdemServico = {
	campo: OrdemServicoCampoExtra;
	nome: string;
	ativo: boolean;
	obrigatorio: boolean;
};

export async function garantirCatalogoTiposOrdemServico(idempresa: string) {
	const existentes = await listarTiposOrdemServicoEvento(idempresa);
	if (existentes.length > 0) {
		return existentes;
	}

	const agora = new Date().toISOString();
	const criados = await criarTiposOrdemServicoEventoEmLote(
		ORDEM_SERVICO_STATUS_PADRAO.map((item) => ({
			id: uuidv4(),
			idempresa,
			codigo: item.codigo,
			status: item.status,
			cor: item.cor,
			descricao: item.descricao,
			ordem: item.ordem,
			ativo: 1,
			padrao: 1,
			datacriacao: agora,
			dataalteracao: agora,
		})),
	);

	return criados;
}

export async function garantirConfiguracaoOrdemServico(
	idempresa: string,
): Promise<ConfiguracaoOrdemServico> {
	const existente = await buscarConfiguracaoOrdemServicoPorEmpresa(idempresa);
	if (existente) return existente;

	const agora = new Date().toISOString();
	const criada = await criarConfiguracaoOrdemServico({
		id: uuidv4(),
		idempresa,
		camposextras: [],
		datacriacao: agora,
		dataalteracao: agora,
	});
	if (!criada) {
		throw new Error("Falha ao criar configuração de ordem de serviço");
	}
	return criada;
}

export async function buscarTipoEventoPadrao(
	idempresa: string,
	codigo: string,
) {
	await garantirCatalogoTiposOrdemServico(idempresa);
	return buscarTipoOrdemServicoEventoPorCodigo(idempresa, codigo);
}

export function validarCamposExtrasConfigurados(
	camposextras: CampoExtraOrdemServico[] | null | undefined,
): { valido: boolean; erro?: string; normalizados: CampoExtraOrdemServico[] } {
	const lista = camposextras ?? [];
	const usados = new Set<string>();
	const normalizados: CampoExtraOrdemServico[] = [];

	for (const item of lista) {
		if (
			!ORDEM_SERVICO_CAMPOS_EXTRA.includes(item.campo as OrdemServicoCampoExtra)
		) {
			return {
				valido: false,
				erro: `Campo extra inválido: ${item.campo}`,
				normalizados: [],
			};
		}
		if (usados.has(item.campo)) {
			return {
				valido: false,
				erro: `Campo extra duplicado: ${item.campo}`,
				normalizados: [],
			};
		}
		usados.add(item.campo);
		normalizados.push({
			campo: item.campo,
			nome: item.nome.trim(),
			ativo: Boolean(item.ativo),
			obrigatorio: Boolean(item.obrigatorio),
		});
		if (!normalizados.at(-1)?.nome) {
			return {
				valido: false,
				erro: `Informe o nome do campo ${item.campo}`,
				normalizados: [],
			};
		}
	}

	return { valido: true, normalizados };
}

export function validarExtrasNaOrdemServico(
	camposextras: CampoExtraOrdemServico[] | null | undefined,
	dados: Record<string, string | null | undefined>,
): { valido: boolean; erro?: string } {
	const mapa = new Map((camposextras ?? []).map((item) => [item.campo, item]));

	for (const campo of ORDEM_SERVICO_CAMPOS_EXTRA) {
		const valor = dados[campo];
		const config = mapa.get(campo);

		if (!config || !config.ativo) {
			if (valor != null && String(valor).trim() !== "") {
				return {
					valido: false,
					erro: `Campo ${campo} não está ativo na configuração da empresa`,
				};
			}
			continue;
		}

		if (config.obrigatorio && (!valor || String(valor).trim() === "")) {
			return {
				valido: false,
				erro: `Campo obrigatório não informado: ${config.nome}`,
			};
		}
	}

	return { valido: true };
}

export function extrairExtrasOrdemServico(
	dados: Record<string, unknown>,
): Record<OrdemServicoCampoExtra, string | null | undefined> {
	const extras = {} as Record<
		OrdemServicoCampoExtra,
		string | null | undefined
	>;
	for (const campo of ORDEM_SERVICO_CAMPOS_EXTRA) {
		const valor = dados[campo];
		extras[campo] =
			valor === undefined || valor === null ? valor : String(valor);
	}
	return extras;
}

export function calcularTotalItem(quantidade: string, preco: string): string {
	const qtd = Number(quantidade);
	const valor = Number(preco);
	if (!Number.isFinite(qtd) || !Number.isFinite(valor)) return "0.000";
	return (qtd * valor).toFixed(3);
}
