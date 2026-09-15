import { z } from "zod";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarConfiguracaoUsuarioService } from "@/service/configuracao-usuario/buscar-configuracao-usuario.js";
import { completarTextoIa } from "@/service/ia/completar-texto.js";
import {
	buscarDetalhesNfceService,
	type DetalhesNfce,
} from "@/service/nfce-emissao/buscar-detalhes-nfce.js";
import { httpOk } from "@/util/http-util.js";

type InterpretarRejeicaoNfceParametros = {
	idusuario: string;
	idempresa: string;
	idnotafiscal: string;
};

export type MotivoNaoInterpretadoRejeicao =
	| "sem_chave"
	| "sem_rejeicao"
	| "erro_ia";

export type InterpretacaoRejeicaoNfce = {
	interpretado: boolean;
	motivoNaoInterpretado: MotivoNaoInterpretadoRejeicao | null;
	mensagem: string | null;
	provedor: string | null;
	classificacao: "PROVAVEL" | "INDETERMINADA" | null;
	explicacao: string | null;
	comoCorrigir: string | null;
};

const respostaIaSchema = z.object({
	classificacao: z.enum(["PROVAVEL", "INDETERMINADA"]),
	explicacao: z.string().min(1),
	comoCorrigir: z.string().min(1),
});

const SYSTEM_PROMPT = `Você é um assistente fiscal do ERP Mais Gestão (Brasil), especializado em NFC-e (modelo 65).

Princípio: NUNCA invente regra tributária, CFOP, CST/CSOSN, alíquota, convênio ou legislação.
Baseie-se APENAS no cStat/xMotivo reais da SEFAZ e no contexto da nota informado.
Se os dados forem insuficientes para afirmar a causa, use classificacao INDETERMINADA e diga o que falta conferir.

Classificação:
- PROVAVEL: o motivo SEFAZ aponta uma causa prática verificável no ERP.
- INDETERMINADA: falta dado, o motivo é genérico ou há mais de uma causa possível.

Responda SOMENTE um JSON válido, sem markdown, neste formato:
{
  "classificacao": "PROVAVEL" | "INDETERMINADA",
  "explicacao": "o que a SEFAZ rejeitou, em linguagem clara, sem inventar norma",
  "comoCorrigir": "passos práticos no ERP Mais Gestão (cadastro de produto, CFOP NFC-e, NCM, certificado, CSC, numeração, destinatário, etc.)"
}

Não cite blogs, fóruns ou respostas de IA como fonte. Não diga que a interpretação é legislação oficial.`;

function respostaVazia(
	parcial: Partial<InterpretacaoRejeicaoNfce> &
		Pick<InterpretacaoRejeicaoNfce, "interpretado">,
): InterpretacaoRejeicaoNfce {
	return {
		interpretado: parcial.interpretado,
		motivoNaoInterpretado: parcial.motivoNaoInterpretado ?? null,
		mensagem: parcial.mensagem ?? null,
		provedor: parcial.provedor ?? null,
		classificacao: parcial.classificacao ?? null,
		explicacao: parcial.explicacao ?? null,
		comoCorrigir: parcial.comoCorrigir ?? null,
	};
}

function extrairJson(texto: string): unknown | null {
	const trimmed = texto.trim();
	const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
	const candidato = fence?.[1]?.trim() ?? trimmed;
	try {
		return JSON.parse(candidato);
	} catch {
		return null;
	}
}

function montarPromptUsuario(detalhes: DetalhesNfce): string {
	const itens = detalhes.itens.map((item, index) => ({
		item: index + 1,
		nome: item.nome,
		ncm: item.ncm,
		cfop: item.cfop,
		cst: item.cst,
		csosn: item.csosn,
		quantidade: item.quantidade,
		valor: item.valortotal,
	}));

	return [
		"Interprete a rejeição SEFAZ desta NFC-e e sugira correção prática no ERP.",
		"",
		`cStat: ${detalhes.rejeicao?.cStat ?? "não informado"}`,
		`xMotivo: ${detalhes.rejeicao?.xMotivo ?? "não informado"}`,
		`status interno: ${detalhes.nota.status ?? "não informado"}`,
		`número/série: ${detalhes.nota.numeronotafiscal ?? "—"}/${detalhes.nota.serie ?? "—"}`,
		`UF emitente: ${detalhes.contextoFiscal.uf ?? "não informado"}`,
		`CRT emitente: ${detalhes.contextoFiscal.crt ?? "não informado"}`,
		`itens: ${JSON.stringify(itens)}`,
		`pagamentos: ${JSON.stringify(detalhes.pagamentos)}`,
	].join("\n");
}

export async function interpretarRejeicaoNfceService({
	idusuario,
	idempresa,
	idnotafiscal,
}: InterpretarRejeicaoNfceParametros): Promise<
	HttpResponse<InterpretacaoRejeicaoNfce>
> {
	const detalhes = await buscarDetalhesNfceService({
		idusuario,
		idempresa,
		idnotafiscal,
	});

	if (!detalhes.success) {
		return {
			success: false as const,
			status: detalhes.status,
			error: detalhes.error,
			code: detalhes.code,
		};
	}

	const body = detalhes.body;
	if (!body) {
		return httpOk(
			respostaVazia({
				interpretado: false,
				motivoNaoInterpretado: "sem_rejeicao",
				mensagem: "Não foi possível carregar os detalhes da NFC-e.",
			}),
		);
	}

	if (!body.rejeicao) {
		return httpOk(
			respostaVazia({
				interpretado: false,
				motivoNaoInterpretado: "sem_rejeicao",
				mensagem: "Esta NFC-e não possui rejeição SEFAZ para interpretar.",
			}),
		);
	}

	const configuracao = await buscarConfiguracaoUsuarioService({
		idusuario,
		idempresa,
	});

	if (!configuracao.success || !configuracao.body) {
		return httpOk(
			respostaVazia({
				interpretado: false,
				motivoNaoInterpretado: "sem_chave",
				mensagem:
					"Configure a chave de IA em Configurações > Integrações para interpretar a rejeição.",
			}),
		);
	}

	const resultadoIa = await completarTextoIa({
		integracoes: configuracao.body.integracoes,
		systemPrompt: SYSTEM_PROMPT,
		mensagem: montarPromptUsuario(body),
	});

	if (!resultadoIa.ok) {
		return httpOk(
			respostaVazia({
				interpretado: false,
				motivoNaoInterpretado: "erro_ia",
				mensagem: resultadoIa.erro,
			}),
		);
	}

	const parsed = extrairJson(resultadoIa.texto);
	const validado = respostaIaSchema.safeParse(parsed);

	if (validado.success) {
		return httpOk({
			interpretado: true,
			motivoNaoInterpretado: null,
			mensagem: null,
			provedor: resultadoIa.provedor,
			classificacao: validado.data.classificacao,
			explicacao: validado.data.explicacao,
			comoCorrigir: validado.data.comoCorrigir,
		});
	}

	return httpOk({
		interpretado: true,
		motivoNaoInterpretado: null,
		mensagem: null,
		provedor: resultadoIa.provedor,
		classificacao: "INDETERMINADA",
		explicacao: resultadoIa.texto,
		comoCorrigir:
			"Revise o motivo SEFAZ acima e os dados da nota no ERP. A IA não devolveu um plano estruturado.",
	});
}
