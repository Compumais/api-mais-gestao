import { v4 as uuidv4 } from "uuid";
import type { NovaBandeiraCartao } from "@/model/bandeira-cartao-model.js";

export type BandeiraCartaoPadrao = {
	codigo: string;
	descricao: string;
};

export const BANDEIRAS_CARTAO_PADRAO: BandeiraCartaoPadrao[] = [
	{ codigo: "visa", descricao: "Visa" },
	{ codigo: "mastercard", descricao: "Mastercard" },
	{ codigo: "elo", descricao: "Elo" },
	{ codigo: "amex", descricao: "American Express" },
	{ codigo: "hipercard", descricao: "Hipercard" },
	{ codigo: "cabal", descricao: "Cabal" },
	{ codigo: "diners", descricao: "Diners Club" },
	{ codigo: "sodexo", descricao: "Sodexo" },
	{ codigo: "ticket", descricao: "Ticket" },
	{ codigo: "vr", descricao: "VR" },
];

export function montarBandeirasCartaoPadrao(
	idempresa: string,
): NovaBandeiraCartao[] {
	const agora = Date.now();

	return BANDEIRAS_CARTAO_PADRAO.map((bandeira) => ({
		id: uuidv4(),
		idempresa,
		codigo: bandeira.codigo,
		descricao: bandeira.descricao,
		inativo: 0,
		currenttimemillis: agora,
	}));
}
