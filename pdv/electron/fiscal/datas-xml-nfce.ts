export type CriterioDataXmlNfce = "emissao" | "autorizacao";

export function obterDataIso(valor: string | null | undefined): string | null {
	const texto = valor?.trim() ?? "";
	const match = texto.match(/^(\d{4}-\d{2}-\d{2})/);
	return match?.[1] ?? null;
}

function valorTagXml(xml: string, nome: string): string | null {
	const re = new RegExp(
		`<(?:[\\w.]+:)?${nome}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</(?:[\\w.]+:)?${nome}>`,
		"i",
	);
	const valor = xml.match(re)?.[1]?.trim();
	return valor || null;
}

export function extrairDatasXmlNfce(xml: string): {
	emissao: string | null;
	autorizacao: string | null;
} {
	return {
		emissao: obterDataIso(valorTagXml(xml, "dhEmi")),
		autorizacao: obterDataIso(valorTagXml(xml, "dhRecbto")),
	};
}

export function dataXmlNoPeriodo(
	data: string | null,
	dataInicio: string,
	dataFim: string,
): boolean {
	if (!data) return false;
	return data >= dataInicio && data <= dataFim;
}

export function xmlNfceEntraNoPeriodo(params: {
	xml: string;
	criterio: CriterioDataXmlNfce;
	dataInicio: string;
	dataFim: string;
	fallbackEmissao?: string | null;
}): { incluir: boolean; data: string | null } {
	const datas = extrairDatasXmlNfce(params.xml);
	const data =
		params.criterio === "autorizacao"
			? datas.autorizacao
			: (datas.emissao ?? obterDataIso(params.fallbackEmissao));
	return {
		incluir: dataXmlNoPeriodo(data, params.dataInicio, params.dataFim),
		data,
	};
}

export function validarPeriodoXmlNfce(
	dataInicio: string,
	dataFim: string,
): string | null {
	const inicio = obterDataIso(dataInicio);
	const fim = obterDataIso(dataFim);
	if (!inicio || !fim) {
		return "Preencha o período completo";
	}
	if (inicio > fim) {
		return "Data inicial não pode ser maior que data final";
	}
	const dias =
		(Date.parse(`${fim}T00:00:00`) - Date.parse(`${inicio}T00:00:00`)) /
		(1000 * 60 * 60 * 24);
	if (dias > 365) {
		return "Período máximo permitido é de 365 dias";
	}
	return null;
}
