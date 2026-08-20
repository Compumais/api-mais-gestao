import { v4 as uuidv4 } from "uuid";
import type { Lote } from "@/model/lote-model.js";
import {
	atualizarLote,
	buscarLotePorId,
	buscarLotePorNumero,
	criarLote,
} from "@/repositories/lote-repositories.js";

export type DadosUpsertLote = {
	idempresa: string;
	idproduto: string;
	numero: string;
	idlote?: string | undefined;
	datafabricacao?: string | null | undefined;
	datavalidade?: string | null | undefined;
	codigoagregacao?: string | null | undefined;
};

function truncarNumeroLote(numero: string): string {
	return numero.trim().slice(0, 20);
}

export async function upsertLoteCadastro(
	dados: DadosUpsertLote,
): Promise<Lote> {
	const numero = truncarNumeroLote(dados.numero);
	if (!numero) {
		throw new Error("Número do lote é obrigatório");
	}

	const existente = dados.idlote
		? await buscarLotePorId(dados.idlote)
		: await buscarLotePorNumero(dados.idempresa, dados.idproduto, numero);

	if (existente) {
		const atualizacao: Parameters<typeof atualizarLote>[1] = {};
		if (!existente.datafabricacao && dados.datafabricacao) {
			atualizacao.datafabricacao = dados.datafabricacao;
		}
		if (!existente.datavalidade && dados.datavalidade) {
			atualizacao.datavalidade = dados.datavalidade;
		}
		if (!existente.codigoagregacao && dados.codigoagregacao) {
			atualizacao.codigoagregacao = dados.codigoagregacao;
		}
		if (Object.keys(atualizacao).length === 0) {
			return existente;
		}
		return (await atualizarLote(existente.id, atualizacao)) ?? existente;
	}

	const criado = await criarLote({
		id: uuidv4(),
		idempresa: dados.idempresa,
		idproduto: dados.idproduto,
		numero,
		datafabricacao: dados.datafabricacao ?? null,
		datavalidade: dados.datavalidade ?? null,
		codigoagregacao: dados.codigoagregacao ?? null,
		quantidade: "0",
		quantidadefiscal: "0",
		inativo: 0,
	});

	if (!criado) {
		throw new Error("Não foi possível criar o lote");
	}

	return criado;
}
