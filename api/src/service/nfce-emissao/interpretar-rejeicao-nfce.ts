import { z } from "zod";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarConfiguracaoUsuarioService } from "@/service/configuracao-usuario/buscar-configuracao-usuario.js";
import { completarTextoIa } from "@/service/ia/completar-texto.js";
import { resolverProvedor } from "@/service/ia/provedores.js";
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

function textoSemCercaMarkdown(texto: string): string {
	const trimmed = texto.trim();
	const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
	if (fence?.[1]) {
		return fence[1].trim();
	}
	return trimmed
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/i, "")
		.trim();
}

function recortarObjetoExterno(texto: string): string {
	const inicio = texto.indexOf("{");
	const fim = texto.lastIndexOf("}");
	if (inicio === -1 || fim <= inicio) {
		return texto;
	}
	return texto.slice(inicio, fim + 1);
}

/**
 * O qwen2.5:1.5b costuma emitir um ponto e vírgula depois de uma string
 * (`";` antes de `}` ou da próxima chave) ou depois da chave de fechamento.
 */
function removerPontoEVirgulaInvalido(json: string): string {
	return json
		.replace(/"\s*;(?=\s*")/g, '",')
		.replace(/"\s*;(?=\s*[,}\]])/g, '"')
		.replace(/;\s*$/g, "");
}

function desescaparStringJson(valor: string): string {
	return valor.replace(
		/\\(u[0-9a-fA-F]{4}|["\\/bfnrt])/g,
		(_, codigo: string) => {
			if (codigo.startsWith("u")) {
				return String.fromCharCode(Number.parseInt(codigo.slice(1), 16));
			}
			switch (codigo) {
				case "n":
					return "\n";
				case "r":
					return "\r";
				case "t":
					return "\t";
				case "b":
					return "\b";
				case "f":
					return "\f";
				default:
					return codigo;
			}
		},
	);
}

function extrairCampoString(texto: string, campo: string): string | null {
	const padrao = new RegExp(`"${campo}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
	const match = texto.match(padrao);
	if (!match?.[1]) {
		return null;
	}
	const valor = desescaparStringJson(match[1]).trim();
	return valor.length > 0 ? valor : null;
}

function recuperarCamposEstruturados(texto: string): {
	classificacao: "PROVAVEL" | "INDETERMINADA";
	explicacao: string;
	comoCorrigir: string;
} | null {
	const classificacao = texto.match(
		/"classificacao"\s*:\s*"(PROVAVEL|INDETERMINADA)"/,
	)?.[1];
	if (classificacao !== "PROVAVEL" && classificacao !== "INDETERMINADA") {
		return null;
	}
	const explicacao = extrairCampoString(texto, "explicacao");
	const comoCorrigir = extrairCampoString(texto, "comoCorrigir");
	if (!explicacao || !comoCorrigir) {
		return null;
	}
	return { classificacao, explicacao, comoCorrigir };
}

function extrairJson(texto: string): unknown | null {
	const semCerca = textoSemCercaMarkdown(texto).replace(/;\s*$/g, "").trim();
	const objeto = recortarObjetoExterno(semCerca);
	const normalizado = removerPontoEVirgulaInvalido(objeto);

	try {
		return JSON.parse(normalizado);
	} catch {
		return (
			recuperarCamposEstruturados(normalizado) ??
			recuperarCamposEstruturados(objeto)
		);
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

	const integracoes =
		configuracao.success && configuracao.body
			? configuracao.body.integracoes
			: {};

	if (!resolverProvedor(integracoes)) {
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
		integracoes,
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
