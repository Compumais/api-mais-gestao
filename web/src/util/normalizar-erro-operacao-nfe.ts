import { obterInfoRejeicao } from "@/constants/nfe-rejeicoes";

export type ContextoErroOperacaoNfe = "emitir" | "preview";

export type CardErroOperacaoNfe = {
	titulo: string;
	motivo: string;
	codigo?: string | null;
	instrucao?: string | null;
};

export type ErroOperacaoNfeNormalizado = {
	tituloToast: string;
	descricaoToast: string;
	card: CardErroOperacaoNfe;
};

const TEXTO_PRE_REQUISITOS =
	/pré-?requisito|pendência|pendencias|csosn\s*101|csosn\s*201|exige alíquota|pCredSN|incompleto/i;

function extrairCodigoRejeicao(mensagem: string): string | null {
	const padroes = [
		/\bc[oó]digo\s+(\d{3})\b/i,
		/\bcStat\s*[:=]?\s*(\d{3})\b/i,
		/\(c[oó]digo\s+(\d{3})\)/i,
		/\brejei[cç][aã]o\s+(\d{3})\b/i,
	];

	for (const padrao of padroes) {
		const match = mensagem.match(padrao);
		if (match?.[1]) return match[1];
	}

	return null;
}

function ehPendenciaPreRequisito(mensagem: string): boolean {
	return TEXTO_PRE_REQUISITOS.test(mensagem);
}

export function normalizarErroOperacaoNfe(
	mensagemBruta: string | null | undefined,
	contexto: ContextoErroOperacaoNfe,
): ErroOperacaoNfeNormalizado {
	const motivo =
		mensagemBruta?.trim() ||
		(contexto === "preview"
			? "Verifique os dados da nota e tente novamente."
			: "Erro desconhecido");

	const codigo = extrairCodigoRejeicao(motivo);
	const rejeicaoInfo = codigo ? obterInfoRejeicao(codigo) : null;
	const pendencia = ehPendenciaPreRequisito(motivo);

	if (pendencia) {
		return {
			tituloToast: "Pré-requisitos incompletos",
			descricaoToast: motivo,
			card: {
				titulo:
					contexto === "preview"
						? "Erro na pré-visualização"
						: "Pré-requisitos incompletos",
				motivo,
				codigo,
				instrucao:
					"Corrija os dados fiscais ou cadastros pendentes e tente novamente.",
			},
		};
	}

	if (codigo) {
		const tituloToast =
			contexto === "preview"
				? `Não foi possível gerar a pré-visualização (código ${codigo})`
				: `NF-e rejeitada (código ${codigo})`;

		return {
			tituloToast,
			descricaoToast: motivo,
			card: {
				titulo:
					contexto === "preview"
						? "Erro na pré-visualização"
						: "NF-e Rejeitada pela SEFAZ",
				motivo,
				codigo,
				instrucao: rejeicaoInfo?.instrucao,
			},
		};
	}

	const tituloToast =
		contexto === "preview"
			? "Não foi possível gerar a pré-visualização"
			: "Erro ao emitir NF-e";

	return {
		tituloToast,
		descricaoToast: motivo,
		card: {
			titulo:
				contexto === "preview"
					? "Erro na pré-visualização"
					: "Erro ao emitir NF-e",
			motivo,
			instrucao:
				contexto === "preview"
					? "Revise os itens, tributação e dados do destinatário antes de tentar novamente."
					: "Verifique os dados e tente novamente.",
		},
	};
}
