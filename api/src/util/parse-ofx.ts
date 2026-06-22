export type TransacaoOfx = {
	idTemporario: string;
	data: string;
	valor: string;
	tipo: "C" | "D";
	historico: string;
	documento: string | null;
};

function extrairTag(bloco: string, tag: string): string | null {
	const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i");
	const match = bloco.match(regex);
	return match?.[1]?.trim() ?? null;
}

function parsearDataOfx(valor: string | null): string | null {
	if (!valor) {
		return null;
	}

	const apenasNumeros = valor.replace(/\[.*\]/, "").replace(/\D/g, "");
	if (apenasNumeros.length < 8) {
		return null;
	}

	const ano = apenasNumeros.slice(0, 4);
	const mes = apenasNumeros.slice(4, 6);
	const dia = apenasNumeros.slice(6, 8);

	return `${ano}-${mes}-${dia}`;
}

function parsearValorOfx(valor: string | null): number | null {
	if (!valor) {
		return null;
	}

	const normalizado = valor.replace(",", ".").trim();
	const numero = Number.parseFloat(normalizado);
	return Number.isFinite(numero) ? numero : null;
}

function resolverTipo(
	trnType: string | null,
	valorNumerico: number,
): "C" | "D" {
	const tipo = trnType?.toUpperCase() ?? "";

	if (
		tipo.includes("CREDIT") ||
		tipo === "DEP" ||
		tipo === "INT" ||
		tipo === "XFER"
	) {
		return "C";
	}

	if (
		tipo.includes("DEBIT") ||
		tipo === "PAYMENT" ||
		tipo === "CHECK" ||
		tipo === "ATM" ||
		tipo === "POS" ||
		tipo === "FEE"
	) {
		return "D";
	}

	return valorNumerico >= 0 ? "C" : "D";
}

function truncarDocumento(valor: string | null): string | null {
	if (!valor) {
		return null;
	}

	return valor.slice(0, 60);
}

function gerarIdTemporario(
	documento: string | null,
	data: string,
	valor: string,
	historico: string,
	indice: number,
): string {
	if (documento) {
		return documento;
	}

	return `${data}-${valor}-${historico}-${indice}`;
}

export function parsearOfx(conteudoOfx: string): TransacaoOfx[] {
	const conteudoNormalizado = conteudoOfx.replace(/\r\n/g, "\n");
	const blocos = conteudoNormalizado.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|<\/STMTTRNRS>|<\/OFX>|$)/gi);

	if (!blocos || blocos.length === 0) {
		throw new Error("Nenhuma transação encontrada no arquivo OFX");
	}

	const transacoes: TransacaoOfx[] = [];

	for (const [indice, bloco] of blocos.entries()) {
		const trnType = extrairTag(bloco, "TRNTYPE");
		const dtPosted = extrairTag(bloco, "DTPOSTED");
		const trnAmt = extrairTag(bloco, "TRNAMT");
		const fitId = extrairTag(bloco, "FITID");
		const memo = extrairTag(bloco, "MEMO");
		const name = extrairTag(bloco, "NAME");

		const valorNumerico = parsearValorOfx(trnAmt);
		const data = parsearDataOfx(dtPosted);

		if (valorNumerico === null || !data) {
			continue;
		}

		const tipo = resolverTipo(trnType, valorNumerico);
		const valorAbsoluto = Math.abs(valorNumerico).toFixed(2);
		const historico = (memo || name || "Movimentação importada").trim();
		const documento = truncarDocumento(fitId);

		transacoes.push({
			idTemporario: gerarIdTemporario(
				documento,
				data,
				valorAbsoluto,
				historico,
				indice,
			),
			data,
			valor: valorAbsoluto,
			tipo,
			historico,
			documento,
		});
	}

	if (transacoes.length === 0) {
		throw new Error("Nenhuma transação válida encontrada no arquivo OFX");
	}

	return transacoes.sort((a, b) => a.data.localeCompare(b.data));
}
