export type AdministradoraCartao = {
	id: string;
	nome: string;
};

/** Adquirentes comuns para títulos de cartão (id gravado em financeiro.idadministradora). */
export const ADMINISTRADORAS_CARTAO: AdministradoraCartao[] = [
	{ id: "cielo", nome: "Cielo" },
	{ id: "rede", nome: "Rede" },
	{ id: "stone", nome: "Stone" },
	{ id: "getnet", nome: "Getnet" },
	{ id: "pagseguro", nome: "PagSeguro" },
	{ id: "mercadopago", nome: "Mercado Pago" },
	{ id: "safrapay", nome: "SafraPay" },
	{ id: "sipag", nome: "SiPag" },
	{ id: "bin", nome: "Bin" },
	{ id: "outro", nome: "Outra" },
];
