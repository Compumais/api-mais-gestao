function money(n: number): string {
	return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function rotuloMeioCupom(meio: string): string {
	if (meio === "CARTAO") return "CARTAO";
	if (meio === "PIX") return "PIX";
	if (meio === "DINHEIRO") return "DINHEIRO";
	if (meio === "MISTO") return "MISTO";
	if (meio === "OUTROS") return "OUTROS";
	return meio;
}

export function linhasPagamentoCupom(venda: {
	meio_pagamento: string;
	pagamentos?: Array<{
		meio: string;
		valor: number;
		descricao?: string | null;
		nsu?: string | null;
		autorizacao?: string | null;
		bandeira?: string | null;
		status?: string | null;
	}>;
}): string[] {
	const efetivos = (venda.pagamentos ?? []).filter(
		(item) => (item.status ?? "ok") === "ok",
	);
	if (!efetivos.length) {
		return [`Pagamento: ${rotuloMeioCupom(venda.meio_pagamento)}`];
	}
	const linhas: string[] = ["PAGAMENTOS"];
	for (const item of efetivos) {
		const rotulo = (item.descricao?.trim() || rotuloMeioCupom(item.meio)).slice(
			0,
			18,
		);
		linhas.push(`${rotulo.padEnd(18)} ${money(item.valor)}`);
		if (item.meio === "CARTAO") {
			if (item.bandeira) {
				linhas.push(`  Bandeira: ${item.bandeira}`);
			}
			if (item.nsu) {
				linhas.push(`  NSU: ${item.nsu}`);
			}
			if (item.autorizacao) {
				linhas.push(`  Autorizacao: ${item.autorizacao}`);
			}
		}
	}
	return linhas;
}
