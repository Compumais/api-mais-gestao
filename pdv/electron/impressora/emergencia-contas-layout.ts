import {
	arredondarMoeda,
	filtrarItensAbertosConta,
} from "../db/conta-gourmet";
import {
	ehModalidadeEntrega,
	normalizarModalidade,
} from "../db/pedido-entrega";

function money(n: number): string {
	return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarQtd(n: number): string {
	const arred = Math.round(n * 1000) / 1000;
	if (Number.isInteger(arred)) return String(arred);
	return arred.toFixed(3).replace(".", ",");
}

export type ItemEmergenciaConta = {
	descricao: string;
	quantidade: number;
	precounitario: number;
	precototal: number;
};

export type ContaEmergenciaImpressao = {
	numero: number;
	nomecliente?: string | null;
	itens: ItemEmergenciaConta[];
	totalAberto: number;
};

/** Conta candidata vinda da listagem de salão (mesa ocupada + conta). */
export type ContaEmergenciaFonte = {
	numero: number;
	status: string;
	modalidade?: string | null;
	nomecliente?: string | null;
	valorrestante: number;
	itens: Array<
		ItemEmergenciaConta & {
			pago?: number | boolean | null;
		}
	>;
};

export function ordenarContasEmergencia<T extends { numero: number }>(
	contas: T[],
): T[] {
	return [...contas].sort((a, b) => a.numero - b.numero);
}

/**
 * Contas de salão ainda abertas. Delivery e retirada ficam de fora
 * (mesmo critério de ehModalidadeEntrega). Itens já pagos não entram.
 */
export function selecionarContasEmergencia(
	contas: ContaEmergenciaFonte[],
): ContaEmergenciaImpressao[] {
	const salao = contas.filter(
		(conta) =>
			conta.status === "aberta" &&
			!ehModalidadeEntrega(normalizarModalidade(conta.modalidade)),
	);
	return ordenarContasEmergencia(
		salao.map((conta) => ({
			numero: conta.numero,
			nomecliente: conta.nomecliente,
			itens: filtrarItensAbertosConta(conta.itens).map((item) => ({
				descricao: item.descricao,
				quantidade: Number(item.quantidade) || 0,
				precounitario: Number(item.precounitario) || 0,
				precototal: Number(item.precototal) || 0,
			})),
			totalAberto: arredondarMoeda(Number(conta.valorrestante) || 0),
		})),
	);
}

export function montarTextoEmergenciaContas(params: {
	rotulo: string;
	contas: ContaEmergenciaImpressao[];
	/** Relógio injetável para testes. */
	agora?: Date;
}): string {
	const agora = params.agora ?? new Date();
	const rotulo = params.rotulo.trim() || "Mesa";
	const contas = ordenarContasEmergencia(params.contas);
	const linhas: string[] = [];
	linhas.push("================================");
	linhas.push("   EMERGENCIA - CONTAS ABERTAS");
	linhas.push("  NAO E DOCUMENTO FISCAL");
	linhas.push("================================");
	linhas.push(`Data: ${agora.toLocaleString("pt-BR")}`);
	linhas.push(`Qtd: ${contas.length}`);

	for (const conta of contas) {
		linhas.push("================================");
		linhas.push(`${rotulo}: ${conta.numero}`);
		if (conta.nomecliente?.trim()) {
			linhas.push(`Cliente: ${conta.nomecliente.trim().slice(0, 28)}`);
		}
		linhas.push("--------------------------------");
		if (!conta.itens.length) {
			linhas.push("Sem itens em aberto");
		} else {
			for (const item of conta.itens) {
				linhas.push((item.descricao || "").slice(0, 32));
				linhas.push(
					`  ${formatarQtd(item.quantidade)} x ${money(item.precounitario)} = ${money(item.precototal)}`,
				);
			}
		}
		linhas.push("--------------------------------");
		linhas.push(`EM ABERTO: ${money(conta.totalAberto)}`);
	}

	const totalGeral = arredondarMoeda(
		contas.reduce((acc, conta) => acc + conta.totalAberto, 0),
	);
	linhas.push("================================");
	linhas.push(`TOTAL GERAL: ${money(totalGeral)}`);
	linhas.push("Relatorio de emergencia.");
	linhas.push("Nao fecha contas nem o caixa.");
	linhas.push("================================");
	linhas.push("\n\n\n");
	return linhas.join("\n");
}
