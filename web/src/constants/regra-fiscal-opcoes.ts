export const LISTA_UFS = [
	{ value: "AC", label: "AC - Acre" },
	{ value: "AL", label: "AL - Alagoas" },
	{ value: "AP", label: "AP - Amapá" },
	{ value: "AM", label: "AM - Amazonas" },
	{ value: "BA", label: "BA - Bahia" },
	{ value: "CE", label: "CE - Ceará" },
	{ value: "DF", label: "DF - Distrito Federal" },
	{ value: "ES", label: "ES - Espírito Santo" },
	{ value: "GO", label: "GO - Goiás" },
	{ value: "MA", label: "MA - Maranhão" },
	{ value: "MT", label: "MT - Mato Grosso" },
	{ value: "MS", label: "MS - Mato Grosso do Sul" },
	{ value: "MG", label: "MG - Minas Gerais" },
	{ value: "PA", label: "PA - Pará" },
	{ value: "PB", label: "PB - Paraíba" },
	{ value: "PR", label: "PR - Paraná" },
	{ value: "PE", label: "PE - Pernambuco" },
	{ value: "PI", label: "PI - Piauí" },
	{ value: "RJ", label: "RJ - Rio de Janeiro" },
	{ value: "RN", label: "RN - Rio Grande do Norte" },
	{ value: "RS", label: "RS - Rio Grande do Sul" },
	{ value: "RO", label: "RO - Rondônia" },
	{ value: "RR", label: "RR - Roraima" },
	{ value: "SC", label: "SC - Santa Catarina" },
	{ value: "SP", label: "SP - São Paulo" },
	{ value: "SE", label: "SE - Sergipe" },
	{ value: "TO", label: "TO - Tocantins" },
	{ value: "EX", label: "EX - Exterior" },
] as const;

export const OPCOES_ORGAO_FONTE = [
	{ value: "SEFAZ", label: "SEFAZ Estadual" },
	{ value: "CONFAZ", label: "CONFAZ" },
	{ value: "RECEITA_FEDERAL", label: "Receita Federal do Brasil" },
	{ value: "OUTRO", label: "Outro Órgão / Tribunal" },
] as const;

export const OPCOES_TIPO_FONTE = [
	{ value: "PROTOCOLO_ICMS", label: "Protocolo ICMS" },
	{ value: "CONVENIO_ICMS", label: "Convênio ICMS" },
	{ value: "DECRETO_ESTADUAL", label: "Decreto Estadual" },
	{ value: "LEI_ESTADUAL", label: "Lei Estadual" },
	{ value: "INSTRUCAO_NORMATIVA", label: "Instrução Normativa" },
	{ value: "PORTARIA", label: "Portaria" },
	{ value: "OUTRO", label: "Outro" },
] as const;

export const OPCOES_PRIORIDADE = [
	{ value: "100", label: "100 - Padrão Geral / Estado" },
	{ value: "200", label: "200 - Específica por CFOP / Operação" },
	{ value: "300", label: "300 - Alta Prioridade (NCM / CEST / Exceção)" },
] as const;
