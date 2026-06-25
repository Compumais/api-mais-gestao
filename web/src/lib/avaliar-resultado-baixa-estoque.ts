import type { ResultadoBaixaEstoqueVenda } from "@/services/estoque-gestao.service";

export class BaixaEstoqueVendaError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BaixaEstoqueVendaError";
	}
}

export interface AvaliacaoResultadoBaixa {
	sucessoCompleto: boolean;
	falhaNfce: boolean;
	falhasEstoque: string[];
	outrosAvisos: string[];
	mensagemErro?: string;
}

function obterMotivoFalhaNfce(resultado: ResultadoBaixaEstoqueVenda): string {
	return (
		resultado.emissaoNfce?.erro ??
		resultado.emissaoNfce?.xMotivo ??
		resultado.emissaoNfce?.pendencias?.map((p) => p.mensagem).join("; ") ??
		resultado.avisos.find((a) => /nfc|sefaz|cfop|duplicidade/i.test(a)) ??
		"Não foi possível emitir a NFC-e"
	);
}

export function avaliarResultadoBaixaEstoque(
	resultado: ResultadoBaixaEstoqueVenda,
): AvaliacaoResultadoBaixa {
	const falhasEstoque = resultado.avisos.filter((a) =>
		a.toLowerCase().includes("estoque"),
	);
	const falhaNfce =
		resultado.deveEmitirNfce && resultado.emissaoNfce?.emitida !== true;

	const avisosCobertos = new Set(falhasEstoque);
	if (falhaNfce) {
		const motivoNfce = obterMotivoFalhaNfce(resultado);
		avisosCobertos.add(motivoNfce);
		for (const aviso of resultado.avisos) {
			if (/nfc|sefaz|cfop|duplicidade|emissão/i.test(aviso)) {
				avisosCobertos.add(aviso);
			}
		}
	}

	const outrosAvisos = resultado.avisos.filter((a) => !avisosCobertos.has(a));
	const sucessoCompleto = !falhaNfce && falhasEstoque.length === 0;

	let mensagemErro: string | undefined;
	if (falhaNfce && falhasEstoque.length > 0) {
		mensagemErro = `${falhasEstoque.join("; ")}. NFC-e: ${obterMotivoFalhaNfce(resultado)}`;
	} else if (falhaNfce) {
		mensagemErro = obterMotivoFalhaNfce(resultado);
	} else if (falhasEstoque.length > 0) {
		mensagemErro = falhasEstoque.join("; ");
	}

	return {
		sucessoCompleto,
		falhaNfce,
		falhasEstoque,
		outrosAvisos,
		mensagemErro,
	};
}

export function obterMotivoFalhaNfceResultado(
	resultado: ResultadoBaixaEstoqueVenda,
): string {
	return obterMotivoFalhaNfce(resultado);
}
