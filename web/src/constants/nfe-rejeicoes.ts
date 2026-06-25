export type NfeRejeicaoInfo = {
	descricao: string;
	instrucao: string;
};

export const NFE_REJEICOES: Record<string, NfeRejeicaoInfo> = {
	"108": {
		descricao: "Serviço Paralisado Momentaneamente (vide Paragrafo Único do Art. 11 do Decreto 7.979/13)",
		instrucao: "Aguarde alguns minutos e tente novamente.",
	},
	"109": {
		descricao: "Serviço Paralisado sem Previsão",
		instrucao: "O serviço da SEFAZ está fora do ar. Considere emissão em contingência.",
	},
	"204": {
		descricao: "Duplicidade de NF-e",
		instrucao: "Uma NF-e com a mesma chave já foi autorizada. Verifique o número/série da NF.",
	},
	"205": {
		descricao: "NF-e está denegada na base de dados da SEFAZ",
		instrucao: "Esta NF-e foi denegada e não pode ser reemitida.",
	},
	"207": {
		descricao: "CNPJ do emitente inválido",
		instrucao: "Confira o CNPJ no cadastro fiscal da empresa.",
	},
	"208": {
		descricao: "CNPJ do destinatário inválido",
		instrucao: "Verifique o CNPJ do destinatário.",
	},
	"209": {
		descricao: "IE do emitente inválida",
		instrucao: "Verifique a Inscrição Estadual no cadastro fiscal da empresa.",
	},
	"210": {
		descricao: "IE do destinatário inválida",
		instrucao: "Verifique a Inscrição Estadual do destinatário.",
	},
	"215": {
		descricao: "Valor Total da NF-e difere do somatório dos valores",
		instrucao: "Confira os valores dos itens e o total da nota.",
	},
	"218": {
		descricao: "Valor Total dos Produtos / Serviços difere do somatório",
		instrucao: "Verifique se o total de produtos bate com a soma dos itens.",
	},
	"228": {
		descricao: "Data de Emissão muito atrasada",
		instrucao: "A data de emissão não pode ser anterior ao prazo permitido.",
	},
	"252": {
		descricao: "CPF do destinatário inválido",
		instrucao: "Verifique o CPF do destinatário.",
	},
	"302": {
		descricao: "IE do emitente não cadastrada",
		instrucao: "A Inscrição Estadual do emitente não consta na SEFAZ. Verifique o cadastro.",
	},
	"399": {
		descricao: "Signer Certificate Problem",
		instrucao: "Problema com o certificado digital. Verifique a validade e o CNPJ do certificado.",
	},
	"401": {
		descricao: "Filtro inválido: 1 diferente de 1",
		instrucao: "Erro interno no XML. Entre em contato com o suporte.",
	},
	"404": {
		descricao: "Uso de séries não permitidas para o CNPJ em questão",
		instrucao: "Série da NF-e inválida para este CNPJ.",
	},
	"408": {
		descricao: "CNPJ Emitente não autorizado a emitir NF-e",
		instrucao: "O CNPJ não está credenciado para emissão de NF-e na SEFAZ.",
	},
	"451": {
		descricao: "Empresa não habilitada para emissão de NF-e via WebService",
		instrucao: "A empresa precisa ser habilitada na SEFAZ do seu estado.",
	},
	"539": {
		descricao: "CNPJ do emitente inválido para a UF",
		instrucao: "Confira o CNPJ e a UF no cadastro fiscal da empresa.",
	},
	"591": {
		descricao: "Informar a tributação do ICMS para cada item",
		instrucao: "Verifique o CST/CSOSN e alíquotas de ICMS dos itens.",
	},
	"594": {
		descricao: "O número de série e/ou número da NF-e informado já foi utilizado",
		instrucao: "Aguarde a emissão ser processada ou utilize outra numeração.",
	},
	"747": {
		descricao: "Certificado Revogado",
		instrucao: "O certificado digital foi revogado. Renove o certificado.",
	},
	"999": {
		descricao: "Erro não catalogado",
		instrucao: "Consulte o xMotivo retornado pela SEFAZ e entre em contato com o suporte.",
	},
};

export function obterInfoRejeicao(cStat: string | number): NfeRejeicaoInfo {
	const codigo = String(cStat);
	return (
		NFE_REJEICOES[codigo] ?? {
			descricao: `Código ${codigo}`,
			instrucao: "Consulte o motivo retornado pela SEFAZ ou entre em contato com o suporte.",
		}
	);
}
