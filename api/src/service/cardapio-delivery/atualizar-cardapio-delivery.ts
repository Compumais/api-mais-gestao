import { v4 as uuidv4 } from "uuid";
import type {
	BairroEntrega,
	CampoFinalizacao,
	CardapioDelivery,
	HorarioCardapio,
	NovoCardapioDelivery,
} from "@/model/cardapio-delivery-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarCardapioDelivery,
	buscarCardapioDeliveryPorEmpresa,
	slugCardapioEmUso,
} from "@/repositories/cardapio-delivery-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { garantirCardapioDeliveryService } from "@/service/cardapio-delivery/garantir-cardapio-delivery.js";
import { gerarSlugCardapio } from "@/util/cardapio-delivery-identidade.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

export type AtualizarCardapioDeliveryDados = {
	slug?: string;
	ativo?: number;
	corprimaria?: string | null;
	habilitadelivery?: number;
	habilitaretirada?: number;
	taxaentregapadrao?: string | number;
	bairrosentrega?: BairroEntrega[];
	pedidominimo?: string | number;
	chavepix?: string | null;
	tempomedioentrega?: string | null;
	mensagemrodape?: string | null;
	horario?: HorarioCardapio;
	camposfinalizacao?: CampoFinalizacao[];
	idmeiospagamento?: string[];
};

type AtualizarCardapioDeliveryParametros = {
	idempresa: string;
	idusuario: string;
	dados: AtualizarCardapioDeliveryDados;
};

function decimal(valor: string | number | undefined): string | undefined {
	if (valor === undefined) return undefined;
	const n =
		typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
	if (!Number.isFinite(n) || n < 0) return undefined;
	return n.toFixed(2);
}

export async function atualizarCardapioDeliveryService({
	idempresa,
	idusuario,
	dados,
}: AtualizarCardapioDeliveryParametros): Promise<
	HttpResponse<CardapioDelivery | null>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const garantir = await garantirCardapioDeliveryService({
		idempresa,
		idusuario,
	});
	if (!garantir.success || !garantir.body) {
		return garantir;
	}

	const existente = garantir.body;
	const patch: Partial<NovoCardapioDelivery> = {
		atualizadoem: new Date().toISOString(),
	};

	if (dados.slug !== undefined) {
		const slug = gerarSlugCardapio(dados.slug);
		if (!slug) return httpBadRequest("Slug inválido");
		if (await slugCardapioEmUso(slug, existente.id)) {
			return httpRecursoExistente("Este endereço de cardápio já está em uso");
		}
		patch.slug = slug;
	}
	if (dados.ativo !== undefined) patch.ativo = dados.ativo ? 1 : 0;
	if (dados.corprimaria !== undefined) patch.corprimaria = dados.corprimaria;
	if (dados.habilitadelivery !== undefined) {
		patch.habilitadelivery = dados.habilitadelivery ? 1 : 0;
	}
	if (dados.habilitaretirada !== undefined) {
		patch.habilitaretirada = dados.habilitaretirada ? 1 : 0;
	}
	const taxa = decimal(dados.taxaentregapadrao);
	if (taxa !== undefined) patch.taxaentregapadrao = taxa;
	if (dados.bairrosentrega !== undefined) {
		patch.bairrosentrega = dados.bairrosentrega.map((bairro) => ({
			nome: bairro.nome.trim(),
			taxa: Number(bairro.taxa) || 0,
		}));
	}
	const minimo = decimal(dados.pedidominimo);
	if (minimo !== undefined) patch.pedidominimo = minimo;
	if (dados.chavepix !== undefined) {
		patch.chavepix = dados.chavepix?.trim() || null;
	}
	if (dados.tempomedioentrega !== undefined) {
		patch.tempomedioentrega = dados.tempomedioentrega?.trim() || null;
	}
	if (dados.mensagemrodape !== undefined) {
		patch.mensagemrodape = dados.mensagemrodape?.trim() || null;
	}
	if (dados.horario !== undefined) patch.horario = dados.horario;
	if (dados.camposfinalizacao !== undefined) {
		patch.camposfinalizacao = dados.camposfinalizacao;
	}
	if (dados.idmeiospagamento !== undefined) {
		patch.idmeiospagamento = dados.idmeiospagamento;
	}

	if (patch.habilitadelivery === 0 && patch.habilitaretirada === 0) {
		return httpBadRequest("Habilite entrega ou retirada");
	}
	if (
		existente.habilitadelivery === 1 &&
		patch.habilitadelivery === 0 &&
		(patch.habilitaretirada ?? existente.habilitaretirada) === 0
	) {
		return httpBadRequest("Habilite entrega ou retirada");
	}

	const atualizado = await atualizarCardapioDelivery(existente.id, patch);
	if (!atualizado) return httpNaoEncontrado();

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "atualizar_cardapio_delivery",
		idusuario,
		recurso: "cardapiodelivery",
		idrecurso: existente.id,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: { camposAlterados: Object.keys(dados) },
	});

	return httpOk(atualizado);
}
