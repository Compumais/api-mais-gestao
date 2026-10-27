const MESES = [
	"janeiro",
	"fevereiro",
	"março",
	"abril",
	"maio",
	"junho",
	"julho",
	"agosto",
	"setembro",
	"outubro",
	"novembro",
	"dezembro",
] as const;

export type PeriodoVendas = {
	dataInicio: string;
	dataFim: string;
	rotulo: string;
};

function semAcento(texto: string): string {
	return texto
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
}

function dataBrasil(agora: Date): { ano: number; mes: number; dia: number } {
	const iso = new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Sao_Paulo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(agora);
	const [ano, mes, dia] = iso.split("-").map(Number);
	return { ano: ano ?? 1970, mes: mes ?? 1, dia: dia ?? 1 };
}

function ultimoDia(ano: number, mes: number): number {
	return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

function iso(ano: number, mes: number, dia: number): string {
	return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function deslocarMes(
	ano: number,
	mes: number,
	delta: number,
): { ano: number; mes: number } {
	const data = new Date(Date.UTC(ano, mes - 1 + delta, 1));
	return { ano: data.getUTCFullYear(), mes: data.getUTCMonth() + 1 };
}

/** Vendas ou faturamento de um mês, sem pedido específico. */
export function interpretarPerguntaVendasPeriodo(
	mensagem: string,
	agora = new Date(),
): PeriodoVendas | null {
	const texto = semAcento(mensagem);
	if (/\bpedido\b/.test(texto) || /[0-9a-f]{8}-[0-9a-f]{4}-/.test(texto)) {
		return null;
	}

	const falaDeVendas =
		/\b(vendas?|faturamento|notas? fiscais)\b/.test(texto) ||
		/\bquanto (vendemos|vendeu|foi vendido)\b/.test(texto);
	if (!falaDeVendas) return null;

	const mesPassado = /\b(mes passado|ultimo mes)\b/.test(texto);
	const mesAtual =
		mesPassado ||
		/\b(deste mes|desse mes|do mes|neste mes|no mes|esse mes|este mes)\b/.test(
			texto,
		);
	if (!mesAtual) return null;

	const hoje = dataBrasil(agora);
	const alvo = mesPassado
		? deslocarMes(hoje.ano, hoje.mes, -1)
		: { ano: hoje.ano, mes: hoje.mes };
	const nomeMes = MESES[alvo.mes - 1] ?? String(alvo.mes);

	return {
		dataInicio: iso(alvo.ano, alvo.mes, 1),
		dataFim: iso(alvo.ano, alvo.mes, ultimoDia(alvo.ano, alvo.mes)),
		rotulo: `${nomeMes}/${alvo.ano}`,
	};
}

export function dataHojeBrasil(agora = new Date()): string {
	const { ano, mes, dia } = dataBrasil(agora);
	return iso(ano, mes, dia);
}
