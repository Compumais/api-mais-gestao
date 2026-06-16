import { v4 as uuidv4 } from "uuid";
import type { NovoPlanoContas } from "@/repositories/plano-contas-repositories.js";

const valoresPadrao = {
	inativo: 0,
	classe: "01",
	centrocustoobrigatorio: 0,
	tipoconta: 1,
	exportaparacontabilidade: 1,
} as const;

type MontarContaParametros = {
	id?: string;
	codigo: string;
	nome: string;
	tipomovimento: "E" | "S";
	idplanocontas?: string;
};

function montarConta(
	idempresa: string,
	timestampMillis: number,
	parametros: MontarContaParametros,
): NovoPlanoContas {
	return {
		id: parametros.id ?? uuidv4(),
		idempresa,
		codigo: parametros.codigo,
		nome: parametros.nome,
		tipomovimento: parametros.tipomovimento,
		currenttimemillis: timestampMillis,
		idplanocontas: parametros.idplanocontas,
		...valoresPadrao,
	};
}

export function montarPlanoContasPadrao(
	idempresa: string,
	timestampMillis: number = Date.now(),
): NovoPlanoContas[] {
	const receitasId = uuidv4();
	const despesasId = uuidv4();
	const reducaoVendasId = uuidv4();
	const estoquesId = uuidv4();
	const imobilizadoId = uuidv4();
	const pessoalId = uuidv4();
	const remuneracaoId = uuidv4();
	const encargosSociaisId = uuidv4();
	const beneficiosId = uuidv4();
	const impostosDiretosId = uuidv4();

	const conta = (parametros: MontarContaParametros) =>
		montarConta(idempresa, timestampMillis, parametros);

	return [
		conta({
			id: receitasId,
			codigo: "1",
			nome: "Receitas",
			tipomovimento: "E",
		}),
		conta({
			codigo: "1 1",
			nome: "Vendas",
			tipomovimento: "E",
			idplanocontas: receitasId,
		}),
		conta({
			codigo: "1 2",
			nome: "Diversas",
			tipomovimento: "E",
			idplanocontas: receitasId,
		}),
		conta({
			id: despesasId,
			codigo: "2",
			nome: "Despesas",
			tipomovimento: "S",
		}),
		conta({
			id: pessoalId,
			codigo: "2 1",
			nome: "Pessoal",
			tipomovimento: "S",
			idplanocontas: despesasId,
		}),
		conta({
			id: remuneracaoId,
			codigo: "2 1 1",
			nome: "Remuneração",
			tipomovimento: "S",
			idplanocontas: pessoalId,
		}),
		conta({
			codigo: "2 1 1 1",
			nome: "Salários",
			tipomovimento: "S",
			idplanocontas: remuneracaoId,
		}),
		conta({
			codigo: "2 1 1 2",
			nome: "Pró-labore",
			tipomovimento: "S",
			idplanocontas: remuneracaoId,
		}),
		conta({
			codigo: "2 1 1 3",
			nome: "Comissões",
			tipomovimento: "S",
			idplanocontas: remuneracaoId,
		}),
		conta({
			codigo: "2 1 1 4",
			nome: "Horas extras",
			tipomovimento: "S",
			idplanocontas: remuneracaoId,
		}),
		conta({
			id: encargosSociaisId,
			codigo: "2 1 2",
			nome: "Encargos sociais",
			tipomovimento: "S",
			idplanocontas: pessoalId,
		}),
		conta({
			codigo: "2 1 2 1",
			nome: "FGTS",
			tipomovimento: "S",
			idplanocontas: encargosSociaisId,
		}),
		conta({
			codigo: "2 1 2 2",
			nome: "INSS",
			tipomovimento: "S",
			idplanocontas: encargosSociaisId,
		}),
		conta({
			codigo: "2 1 2 3",
			nome: "13o Salários",
			tipomovimento: "S",
			idplanocontas: encargosSociaisId,
		}),
		conta({
			codigo: "2 1 2 4",
			nome: "Férias",
			tipomovimento: "S",
			idplanocontas: encargosSociaisId,
		}),
		conta({
			codigo: "2 1 2 5",
			nome: "Vale transporte",
			tipomovimento: "S",
			idplanocontas: encargosSociaisId,
		}),
		conta({
			codigo: "2 1 2 6",
			nome: "FGTS sobre 13º salário",
			tipomovimento: "S",
			idplanocontas: encargosSociaisId,
		}),
		conta({
			codigo: "2 1 2 7",
			nome: "INSS sobre 13º salário",
			tipomovimento: "S",
			idplanocontas: encargosSociaisId,
		}),
		conta({
			codigo: "2 1 2 8",
			nome: "Aviso prévio",
			tipomovimento: "S",
			idplanocontas: encargosSociaisId,
		}),
		conta({
			codigo: "2 1 2 9",
			nome: "FGTS sobre Férias",
			tipomovimento: "S",
			idplanocontas: encargosSociaisId,
		}),
		conta({
			codigo: "2 1 2 10",
			nome: "INSS sobre Férias",
			tipomovimento: "S",
			idplanocontas: encargosSociaisId,
		}),
		conta({
			codigo: "2 1 2 11",
			nome: "Repouso remunerado",
			tipomovimento: "S",
			idplanocontas: encargosSociaisId,
		}),
		conta({
			id: beneficiosId,
			codigo: "2 1 3",
			nome: "Benefícios",
			tipomovimento: "S",
			idplanocontas: pessoalId,
		}),
		conta({
			codigo: "2 1 3 1",
			nome: "Plano de saúde",
			tipomovimento: "S",
			idplanocontas: beneficiosId,
		}),
		conta({
			codigo: "2 1 3 2",
			nome: "Plano refeição",
			tipomovimento: "S",
			idplanocontas: beneficiosId,
		}),
		conta({
			codigo: "2 1 3 3",
			nome: "Seguro de vida",
			tipomovimento: "S",
			idplanocontas: beneficiosId,
		}),
		conta({
			codigo: "2 1 3 4",
			nome: "Treinamento de pessoal",
			tipomovimento: "S",
			idplanocontas: beneficiosId,
		}),
		conta({
			id: reducaoVendasId,
			codigo: "3",
			nome: "Redução de vendas",
			tipomovimento: "S",
		}),
		conta({
			id: impostosDiretosId,
			codigo: "3 1",
			nome: "Impostos diretos",
			tipomovimento: "S",
			idplanocontas: reducaoVendasId,
		}),
		conta({
			codigo: "3 1 1",
			nome: "ICMS",
			tipomovimento: "S",
			idplanocontas: impostosDiretosId,
		}),
		conta({
			codigo: "3 1 2",
			nome: "ISS",
			tipomovimento: "S",
			idplanocontas: impostosDiretosId,
		}),
		conta({
			codigo: "3 1 3",
			nome: "IPI",
			tipomovimento: "S",
			idplanocontas: impostosDiretosId,
		}),
		conta({
			codigo: "3 1 4",
			nome: "COFINS",
			tipomovimento: "S",
			idplanocontas: impostosDiretosId,
		}),
		conta({
			codigo: "3 1 5",
			nome: "PIS",
			tipomovimento: "S",
			idplanocontas: impostosDiretosId,
		}),
		conta({
			codigo: "3 1 6",
			nome: "SIMPLES",
			tipomovimento: "S",
			idplanocontas: impostosDiretosId,
		}),
		conta({
			id: estoquesId,
			codigo: "4",
			nome: "Estoques",
			tipomovimento: "E",
		}),
		conta({
			codigo: "4 1",
			nome: "Material p/ industrialização",
			tipomovimento: "E",
			idplanocontas: estoquesId,
		}),
		conta({
			codigo: "4 2",
			nome: "Material p/ revenda",
			tipomovimento: "E",
			idplanocontas: estoquesId,
		}),
		conta({
			id: imobilizadoId,
			codigo: "5",
			nome: "Imobilizado",
			tipomovimento: "E",
		}),
		conta({
			codigo: "5 1",
			nome: "Equipamentos",
			tipomovimento: "E",
			idplanocontas: imobilizadoId,
		}),
	];
}
