import type {
	ConferenciaCaixa,
	ResumoTurnoCaixa,
} from "../db/resumo-turno-caixa";
import { formatarLinhaItemVendidoTurno } from "../db/itens-vendidos-turno";

export type DadosComprovanteFechamentoCaixa = {
	nomeempresa?: string | null;
	username?: string | null;
	numeropdv: number;
	abertoem: string;
	fechadoem: string;
	resumo: ResumoTurnoCaixa;
	conferencia: ConferenciaCaixa;
	observacao?: string | null;
};

function money(n: number): string {
	return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataHora(valor: string): string {
	const data = new Date(valor);
	if (Number.isNaN(data.getTime())) return valor;
	return data.toLocaleString("pt-BR");
}

export function montarTextoComprovanteFechamentoCaixa(
	dados: DadosComprovanteFechamentoCaixa,
): string {
	const { resumo, conferencia } = dados;
	const linhas: string[] = [];
	linhas.push("================================");
	linhas.push("     FECHAMENTO DE CAIXA");
	linhas.push("================================");
	if (dados.nomeempresa?.trim()) {
		linhas.push(dados.nomeempresa.trim().slice(0, 32));
	}
	linhas.push(`PDV: ${dados.numeropdv}`);
	if (dados.username?.trim()) {
		linhas.push(`Operador: ${dados.username.trim().slice(0, 22)}`);
	}
	linhas.push(`Abertura: ${dataHora(dados.abertoem)}`);
	linhas.push(`Fechamento: ${dataHora(dados.fechadoem)}`);
	linhas.push("--------------------------------");
	linhas.push(`Suprimento: ${money(resumo.suprimento)}`);
	linhas.push(`Vendas (${resumo.qtdVendas}): ${money(resumo.saldoapurado)}`);
	linhas.push(`  Dinheiro: ${money(resumo.pagamentos.dinheiro)}`);
	linhas.push(`  PIX: ${money(resumo.pagamentos.pix)}`);
	linhas.push(`  Cartao: ${money(resumo.pagamentos.cartao)}`);
	if (resumo.pagamentos.prepago > 0) {
		linhas.push(`  Pre-pago: ${money(resumo.pagamentos.prepago)}`);
	}
	linhas.push("--------------------------------");
	linhas.push(`Esperado na gaveta: ${money(resumo.saldoCaixaFisico)}`);
	linhas.push(`Informado: ${money(conferencia.saldoinformado)}`);
	if (conferencia.diferenca === 0) {
		linhas.push("Caixa conferido - sem diferenca");
	} else if (conferencia.sobra > 0) {
		linhas.push(`Sobra: ${money(conferencia.sobra)}`);
	} else {
		linhas.push(`Falta: ${money(conferencia.falta)}`);
	}
	if (dados.observacao?.trim()) {
		linhas.push("--------------------------------");
		linhas.push("Obs:");
		linhas.push(dados.observacao.trim().slice(0, 64));
	}
	linhas.push("================================");
	linhas.push("\n\n\n");
	return linhas.join("\n");
}

export type DadosItensVendidosTurno = {
	nomeempresa?: string | null;
	username?: string | null;
	numeropdv: number;
	abertoem: string;
	emitidoem: string;
	itens: Array<{ descricao: string; quantidade: number }>;
};

export function montarTextoItensVendidosTurno(
	dados: DadosItensVendidosTurno,
): string {
	const linhas: string[] = [];
	linhas.push("================================");
	linhas.push("     ITENS VENDIDOS NO TURNO");
	linhas.push("================================");
	if (dados.nomeempresa?.trim()) {
		linhas.push(dados.nomeempresa.trim().slice(0, 32));
	}
	linhas.push(`PDV: ${dados.numeropdv}`);
	if (dados.username?.trim()) {
		linhas.push(`Operador: ${dados.username.trim().slice(0, 22)}`);
	}
	linhas.push(`Turno desde: ${dataHora(dados.abertoem)}`);
	linhas.push(`Emitido: ${dataHora(dados.emitidoem)}`);
	linhas.push("--------------------------------");
	if (!dados.itens.length) {
		linhas.push("Nenhum item vendido neste turno.");
	} else {
		for (const item of dados.itens) {
			linhas.push(
				formatarLinhaItemVendidoTurno({
					idproduto: "",
					descricao: item.descricao,
					quantidade: item.quantidade,
				}),
			);
		}
	}
	linhas.push("================================");
	linhas.push("\n\n\n");
	return linhas.join("\n");
}
