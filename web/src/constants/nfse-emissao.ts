export const MODELO_NFSE = "NFS";

export const TIPO_ORIGEM_NFSE = 2;

export const NFSE_PROVEDORES = [
	{ value: "abrasf", label: "ABRASF (genérico)" },
	{ value: "issnet", label: "ISSNet" },
	{ value: "ginfes", label: "GINFES" },
	{ value: "ipm", label: "IPM Sistemas" },
	{ value: "betha", label: "Betha" },
	{
		value: "sefin_nacional",
		label: "Sefin Nacional (Emissor Público)",
	},
] as const;

export const NFSE_AMBIENTE_LABELS: Record<number, string> = {
	1: "Produção",
	2: "Homologação",
};

export const NFSE_LAYOUTS = [
	{ value: "2.02", label: "ABRASF 2.02 (RPS e-gov)" },
	{ value: "dps-1.01", label: "Nota Nacional DPS 1.01" },
] as const;

export const BETHA_DPS_WSDL =
	"https://nota-eletronica.betha.cloud/dps/ws/service.wsdl";

export const SEFIN_NACIONAL_URL_HOMOLOGACAO =
	"https://sefin.producaorestrita.nfse.gov.br/SefinNacional";

export const SEFIN_NACIONAL_URL_PRODUCAO =
	"https://sefin.nfse.gov.br/SefinNacional";

export function isProvedorSefinNacional(
	provedor?: string | null,
): boolean {
	const p = (provedor ?? "").toLowerCase().trim();
	return p === "sefin_nacional" || p === "sefin-nacional" || p === "adn";
}

export function isLayoutNfseDps(
	versaolayout?: string | null,
	provedor?: string | null,
): boolean {
	if (isProvedorSefinNacional(provedor)) {
		return true;
	}
	const v = (versaolayout ?? "").toLowerCase();
	return v.includes("dps") || v.includes("nacional");
}

export function urlBaseSefinNacional(ambiente?: number | null): string {
	return ambiente === 1
		? SEFIN_NACIONAL_URL_PRODUCAO
		: SEFIN_NACIONAL_URL_HOMOLOGACAO;
}

/**
 * Indicadores de Operação IBS/CBS (Anexo VII - Portal Nacional).
 * cIndOp com 6 dígitos numéricos.
 */
export const NFSE_CINDOP_OPCOES = [
	{
		value: "100301",
		label: "100301 — Prestação de serviço no país (domicílio do tomador)",
		descricao: "Padrão mais comum para TI, consultoria, suporte remoto e serviços gerais.",
	},
	{
		value: "050101",
		label: "050101 — Prestação no estabelecimento do prestador",
		descricao: "Serviços executados presencialmente na sede/loja do prestador.",
	},
	{
		value: "010101",
		label: "010101 — Fornecimento / demais operações gerais",
		descricao: "Operações padrão gerais de fornecimento.",
	},
	{
		value: "020101",
		label: "020101 — Serviços de transporte",
		descricao: "Transporte e logística de serviços municipais.",
	},
	{
		value: "070101",
		label: "070101 — Serviços relacionados a obras e construção civil",
		descricao: "Engenharia, construção, reformas e instalações no local da obra.",
	},
] as const;

/**
 * Mapeamento de auxílio para códigos da LC 116/03 sugerindo cTribNac e cNBS padrão.
 */
export const SUGESTOES_LC116_FISCAL: Record<
	string,
	{ cTribNac: string; cNbsPadrao?: string; cIndOpPadrao?: string }
> = {
	"01.01": { cTribNac: "010101", cNbsPadrao: "115011000", cIndOpPadrao: "100301" },
	"01.02": { cTribNac: "010201", cNbsPadrao: "115012000", cIndOpPadrao: "100301" },
	"01.03": { cTribNac: "010301", cNbsPadrao: "115013000", cIndOpPadrao: "100301" },
	"01.04": { cTribNac: "010401", cNbsPadrao: "115022000", cIndOpPadrao: "100301" },
	"01.05": { cTribNac: "010501", cNbsPadrao: "115031000", cIndOpPadrao: "100301" },
	"01.06": { cTribNac: "010601", cNbsPadrao: "115032000", cIndOpPadrao: "100301" },
	"01.07": { cTribNac: "010701", cNbsPadrao: "115021000", cIndOpPadrao: "100301" },
	"01.08": { cTribNac: "010801", cNbsPadrao: "115041000", cIndOpPadrao: "100301" },
	"07.02": { cTribNac: "070201", cNbsPadrao: "121011000", cIndOpPadrao: "070101" },
	"14.01": { cTribNac: "140101", cNbsPadrao: "118011000", cIndOpPadrao: "050101" },
	"14.02": { cTribNac: "140201", cNbsPadrao: "118021000", cIndOpPadrao: "050101" },
	"17.01": { cTribNac: "170101", cNbsPadrao: "114011000", cIndOpPadrao: "100301" },
};

/**
 * Tabela com os principais códigos NBS (Nomenclatura Brasileira de Serviços - Anexo B)
 * com descrições para busca amigável do usuário.
 */
export const NFSE_NBS_LISTA = [
	{
		codigo: "115021000",
		descricao: "Serviços de suporte técnico em informática e TI",
		categoria: "Tecnologia da Informação",
	},
	{
		codigo: "115011000",
		descricao: "Desenvolvimento e customização de programas de computador (software)",
		categoria: "Tecnologia da Informação",
	},
	{
		codigo: "115012000",
		descricao: "Planejamento e desenvolvimento de páginas web (web design e portais)",
		categoria: "Tecnologia da Informação",
	},
	{
		codigo: "115022000",
		descricao: "Serviços de gerenciamento e administração de redes e sistemas",
		categoria: "Tecnologia da Informação",
	},
	{
		codigo: "115031000",
		descricao: "Serviços de hospedagem de páginas, servidores e data centers",
		categoria: "Tecnologia da Informação",
	},
	{
		codigo: "115032000",
		descricao: "Processamento de dados, provedores de aplicação e streaming",
		categoria: "Tecnologia da Informação",
	},
	{
		codigo: "114011000",
		descricao: "Serviços de consultoria em gestão e estratégia empresarial",
		categoria: "Consultoria e Gestão",
	},
	{
		codigo: "114012000",
		descricao: "Serviços de consultoria em gestão financeira",
		categoria: "Consultoria e Gestão",
	},
	{
		codigo: "114013000",
		descricao: "Serviços de consultoria em marketing e vendas",
		categoria: "Consultoria e Gestão",
	},
	{
		codigo: "114014000",
		descricao: "Serviços de consultoria em recursos humanos e recrutamento",
		categoria: "Consultoria e Gestão",
	},
	{
		codigo: "118011000",
		descricao: "Manutenção e reparação mecânica de veículos e máquinas",
		categoria: "Manutenção e Instalação",
	},
	{
		codigo: "118012000",
		descricao: "Manutenção e reparação elétrica e eletrônica",
		categoria: "Manutenção e Instalação",
	},
	{
		codigo: "118021000",
		descricao: "Instalação e montagem de máquinas, aparelhos e equipamentos",
		categoria: "Manutenção e Instalação",
	},
	{
		codigo: "121011000",
		descricao: "Serviços de engenharia civil e construção de edifícios",
		categoria: "Construção e Engenharia",
	},
	{
		codigo: "121012000",
		descricao: "Projetos de arquitetura e urbanismo",
		categoria: "Construção e Engenharia",
	},
	{
		codigo: "121013000",
		descricao: "Projetos de engenharia elétrica, hidráulica e mecânica",
		categoria: "Construção e Engenharia",
	},
	{
		codigo: "117011000",
		descricao: "Serviços de contabilidade, auditoria e assessoria tributária",
		categoria: "Serviços Jurídicos e Contábeis",
	},
	{
		codigo: "117012000",
		descricao: "Serviços de assessoria e consultoria jurídica / advocacia",
		categoria: "Serviços Jurídicos e Contábeis",
	},
	{
		codigo: "123011000",
		descricao: "Serviços de transporte rodoviário de cargas municipal",
		categoria: "Transporte e Logística",
	},
	{
		codigo: "123021000",
		descricao: "Serviços de entrega rápida, malote e motofrete",
		categoria: "Transporte e Logística",
	},
	{
		codigo: "125011000",
		descricao: "Serviços de publicidade, propaganda e agências de marketing",
		categoria: "Comunicação e Design",
	},
	{
		codigo: "125012000",
		descricao: "Design gráfico, comunicação visual e criação artística",
		categoria: "Comunicação e Design",
	},
	{
		codigo: "127011000",
		descricao: "Serviços de limpeza, conservação e portaria",
		categoria: "Serviços Gerais",
	},
	{
		codigo: "127012000",
		descricao: "Serviços de vigilância e segurança privada",
		categoria: "Serviços Gerais",
	},
	{
		codigo: "128011000",
		descricao: "Treinamentos, cursos e instrução profissionalizante",
		categoria: "Educação e Treinamento",
	},
] as const;


