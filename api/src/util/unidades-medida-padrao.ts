export type UnidadeMedidaPadrao = {
	codigo: string;
	nome: string;
	casasdecimais: number;
	tipovalor: number;
};

export const UNIDADES_MEDIDA_PADRAO: UnidadeMedidaPadrao[] = [
	{
		codigo: "UN",
		nome: "Unidade",
		casasdecimais: 0,
		tipovalor: 0,
	},
	{
		codigo: "KG",
		nome: "Quilograma",
		casasdecimais: 3,
		tipovalor: 0,
	},
	{
		codigo: "G",
		nome: "Grama",
		casasdecimais: 3,
		tipovalor: 0,
	},
	{
		codigo: "LT",
		nome: "Litro",
		casasdecimais: 3,
		tipovalor: 0,
	},
	{
		codigo: "ML",
		nome: "Mililitro",
		casasdecimais: 3,
		tipovalor: 0,
	},
	{
		codigo: "CX",
		nome: "Caixa",
		casasdecimais: 0,
		tipovalor: 0,
	},
	{
		codigo: "PC",
		nome: "Peça",
		casasdecimais: 0,
		tipovalor: 0,
	},
	{
		codigo: "M",
		nome: "Metro",
		casasdecimais: 2,
		tipovalor: 0,
	},
	{
		codigo: "M2",
		nome: "Metro Quadrado",
		casasdecimais: 2,
		tipovalor: 0,
	},
	{
		codigo: "M3",
		nome: "Metro Cúbico",
		casasdecimais: 3,
		tipovalor: 0,
	},
];
