export type UnidadeMedidaPadrao = {
	id: string;
	codigo: string;
	nome: string;
	casasdecimais: number;
	tipovalor: number;
};

export const UNIDADES_MEDIDA_PADRAO: UnidadeMedidaPadrao[] = [
	{
		id: "a0000001-0000-4000-8000-000000000001",
		codigo: "UN",
		nome: "Unidade",
		casasdecimais: 0,
		tipovalor: 0,
	},
	{
		id: "a0000001-0000-4000-8000-000000000002",
		codigo: "KG",
		nome: "Quilograma",
		casasdecimais: 3,
		tipovalor: 0,
	},
	{
		id: "a0000001-0000-4000-8000-000000000003",
		codigo: "G",
		nome: "Grama",
		casasdecimais: 3,
		tipovalor: 0,
	},
	{
		id: "a0000001-0000-4000-8000-000000000004",
		codigo: "LT",
		nome: "Litro",
		casasdecimais: 3,
		tipovalor: 0,
	},
	{
		id: "a0000001-0000-4000-8000-000000000005",
		codigo: "ML",
		nome: "Mililitro",
		casasdecimais: 3,
		tipovalor: 0,
	},
	{
		id: "a0000001-0000-4000-8000-000000000006",
		codigo: "CX",
		nome: "Caixa",
		casasdecimais: 0,
		tipovalor: 0,
	},
	{
		id: "a0000001-0000-4000-8000-000000000007",
		codigo: "PC",
		nome: "Peça",
		casasdecimais: 0,
		tipovalor: 0,
	},
	{
		id: "a0000001-0000-4000-8000-000000000008",
		codigo: "M",
		nome: "Metro",
		casasdecimais: 2,
		tipovalor: 0,
	},
	{
		id: "a0000001-0000-4000-8000-000000000009",
		codigo: "M2",
		nome: "Metro Quadrado",
		casasdecimais: 2,
		tipovalor: 0,
	},
	{
		id: "a0000001-0000-4000-8000-000000000010",
		codigo: "M3",
		nome: "Metro Cúbico",
		casasdecimais: 3,
		tipovalor: 0,
	},
];
