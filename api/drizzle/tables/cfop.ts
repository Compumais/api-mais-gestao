import {
	bigint,
	integer,
	numeric,
	pgTable,
	smallint,
	text,
	varchar,
} from "drizzle-orm/pg-core";

export const cfop = pgTable("cfop", {
	id: text().primaryKey().notNull(), // Chave primária
	idempresa: text().notNull(), // ID da empresa
	abatericmsbasepiscofins: smallint(), // Abater o ICMS da base do PIS/COFINS
	abatericmsdesonbasepiscofins: smallint(), // Abater o ICMS desonerado da base do PIS/COFINS
	abatericmsst30: smallint(), // Abater ICMS da situação tributária 30 do ICMS de substituição
	adicionarpiscofinsinfcomp: smallint(), // Indica se o PIS e COFINS irá ser informado nas informações adicionais
	aliquotacofins: numeric({ precision: 12, scale: 4 }), // Alíquota do COFINS
	aliquotacofinsentrada: numeric({ precision: 12, scale: 4 }), // Alíquota do COFINS
	aliquotacofinsretido: numeric({ precision: 5, scale: 2 }), // Percentual de INSS
	aliquotaipientrada: numeric({ precision: 12, scale: 4 }), // % IPI de entrada
	aliquotaipisaida: numeric({ precision: 12, scale: 4 }), // % IPI de saída
	aliquotapis: numeric({ precision: 12, scale: 4 }), // Alíquota do PIS
	aliquotapisentrada: numeric({ precision: 12, scale: 4 }), // Alíquota do PIS
	aliquotapisretido: numeric({ precision: 5, scale: 2 }), // Percentual de INSS
	calculabaseicmsparaelemesmo: smallint(), // Calcula base de ICMS para ele mesmo
	calculafundocombatepobreza: smallint(), // Calcula fundo de combate a pobreza
	calculardifalcomaliquotazero: smallint(), // Calcular DIFAL com alíquota zero
	calculardiferencialaliqicmsst: smallint(), // Calcular diferencial de alíquotas do ICMS ST
	calcularicmsefetivo: varchar({ length: 1 }), // Calcular ICMS efetivo
	calcularicmsstpelocusto: smallint(), // Calcular ICMS ST pelo custo
	calcularimpostoaproximado: smallint(), // Calcular imposto aproximado
	cfopentradasped: varchar({ length: 3 }), // Cfop entrada sped
	cfopsaidasped: varchar({ length: 3 }), // Cfop saída sped
	codigo: varchar({ length: 20 }), // Código
	codigoantecipacao: integer(), // Código antecipação sintegra
	codigocfopservicog2ka: varchar({ length: 1 }), // Codigo cfop serviço G2ka
	conferencianotafiscal: smallint(), // Nota fiscal precisa de conferência
	conferenciapedido: smallint(), // Relacionar pedido de compra para conferência financeira
	configuracaoadicionalnfse1: varchar({ length: 10 }), // Configuração adicional 1 da NFS-e
	configuracaoadicionalnfse2: varchar({ length: 10 }), // Configuração adicional 2 da NFS-e
	configuracaoadicionalnfse3: varchar({ length: 10 }), // Configuração adicional 3 da NFS-e
	consideracustomedio: smallint(), // Utilizada para calculo custo médio das mercadorias
	consideradespaduanbaseicms: smallint(), // Considera despesas aduaneiras na base do ICMS
	consideradevolucaovenda: smallint(), // Considera devolução de venda
	considerafretebaseipi: smallint(), // Somar valor do frete na base de IPI
	consideraicmsstbasepiscofins: smallint(), // Considera ICMS substituição tributária na base do PIS/COFINS
	consideraimpimportacaobaseicms: smallint(), // Considera imposto de importação na base do ICMS
	considerainscricaoestadualsub: smallint(), // Utilizar a incrição estadual de substituto
	consideraiofbaseicms: smallint(), // Considera IOF na base do ICMS
	consideraipi: smallint(), // Destaca IPI?
	consideraipibaseicms: smallint(), // Indica se o IPI será considerado na base de cálculo do ICMS
	consideraipibaseicmsst: smallint(), // Indica se o IPI será considerado na base de cálculo do ICMS ST
	consideraipibasepiscofins: smallint(), // Considera IPI na base do PIS/COFINS
	consideraoutdespbaseipi: smallint(), // Somar valor de outras despesas na base de IPI
	considerarcofinsbaseicms: smallint(), // Considerar valor do COFINS na base de cáculo do ICMS
	considerardespimpbasepiscof: smallint(), // Considerar despesas de importação na base de cálculo de PIS/COFINS
	considerarpisbaseicms: smallint(), // Considerar valor do PIS na base de cáculo do ICMS
	considerarproduto: smallint(), // Considerar produtos na nota fiscal
	considerarservico: smallint(), // Considerar serviços na nota fiscal
	consideravenda: smallint(), // Considera a natureza de operação fiscal como venda - 0=Não 1=Sim
	consignacao: smallint(), // Consignação
	consignacaoentrada: smallint(), // Consignação de entrada
	consumidorfinal: smallint(), // Consumidor final
	contranotafunrural: smallint(), // Contra nota FUNRURAL
	contribuinte: integer(), // Contribuinte?
	controlasaldofiscal: smallint(), // Controla estoque de terceiros
	cstac: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Acre
	cstal: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Alagoas
	cstam: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Amazonas
	cstap: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Amapá
	cstba: varchar({ length: 3 }), // Situação tributária do ICMS para o estado da Bahia
	cstce: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Ceara
	cstcofins: varchar({ length: 2 }), // Situação tributária do COFINS
	cstcofinsentrada: varchar({ length: 2 }), // Situção tributária do COFINS
	cstdf: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Distrito Federal
	cstes: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Espirito Santo
	cstex: varchar({ length: 3 }), // Situação tributária do ICMS para o exterior
	cstgo: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de Goias
	cstipientrada: varchar({ length: 3 }), // Situação tributária do IPI de entrada
	cstipisaida: varchar({ length: 3 }), // Situação tributária do IPI de saída
	cstma: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Maranhã
	cstmg: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de Minas Gerais
	cstms: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Mato Grosso do Sul
	cstmt: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Mato Grosso
	cstpa: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Pará
	cstpb: varchar({ length: 3 }), // Situação tributária do ICMS para o estado da Paraiba
	cstpe: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Pernambuco
	cstpi: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Piauí
	cstpis: varchar({ length: 2 }), // Situação tributária do PIS
	cstpisentrada: varchar({ length: 2 }), // Situção tributária do PIS
	cstpr: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Paraná
	cstrj: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Rio de Janeiro
	cstrn: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Rio Grande do Norte
	cstro: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de Rondonia
	cstrr: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de Roraima
	cstrs: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Rio Grande do Sul
	cstsc: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de Santa Catarina
	cstse: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de Sergipe
	cstservico: varchar({ length: 3 }), // CST Serviço
	cstsp: varchar({ length: 3 }), // Situação tributária do ICMS para o estado de São Paulo
	cstto: varchar({ length: 3 }), // Situação tributária do ICMS para o estado do Tocantins
	currenttimemillis: bigint({ mode: "number" }), // Time millis da alteracao do registro
	descricao: varchar({ length: 1024 }), // Descrição
	descricaocompleta: varchar({ length: 320 }), // Descrição completa
	destaqueimposto: smallint(), // Destaca imposto
	digitarimpostositemnotasaida: smallint(), // Permitir digitar impostos do item na nota fiscal de saída
	digitartotalitemmanualmente: smallint(), // Digitar valor do item pelo valor total
	enviartagicmsstretzero: smallint(), // Enviar Tags do ICMS ST retido zerado
	enviartagsdiferimentototal: smallint(), // Enviar informações de diferimento total na NF-e
	exigirdocumentoreferenciado: smallint(), // Exigir documento fiscal referenciado
	finalidadeemissaonfe: smallint(), // Finalidade emissão NF-e
	forcaricmssn: smallint(), // Forçar cálculo de ICMS mesmo quando empresa é Simples Nacional
	forcaripidevolvido: smallint(), // Forçar IPI devolvido
	fundamentacaolegalestado: varchar({ length: 100 }), // Fundamentação legal do Estado
	gerarcreditoicmsst: smallint(), // Gerar crédito ICMS ST
	gerarcreditoipi: smallint(), // Gerar crédito IPI
	habilitabaseipiitemnota: smallint(), // Habilita campo de base de IPI no item da nota fiscal
	habilitabasepiscofinsitemnota: smallint(), // Habilita campo de base de PIS/COFINS no item da nota fiscal
	icmsac: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Acre
	icmsal: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Alagoas
	icmsam: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Amazonas
	icmsap: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Amapá
	icmsba: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado da Bahia
	icmsce: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Ceara
	icmsdevidouforigemconhecimento: smallint(), // ICMS devido à UF de origem de prestação.
	icmsdf: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Distrito Federal
	icmses: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Espirito Santo
	icmsex: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o exterior
	icmsgo: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de Goias
	icmsma: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Maranhã
	icmsmg: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de Minas Gerais
	icmsms: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Mato Grosso do Sul
	icmsmt: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Mato Grosso
	icmspa: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Pará
	icmspb: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado da Paraiba
	icmspe: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Pernambuco
	icmspi: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Piauí
	icmspr: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Paraná
	icmsrj: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Rio de Janeiro
	icmsrn: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Rio Grande do Norte
	icmsro: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de Rondonia
	icmsrr: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de Roraima
	icmsrs: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Rio Grande do Sul
	icmssc: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de Santa Catarina
	icmsse: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de Sergipe
	icmssp: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado de São Paulo
	icmsstac: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Acre
	icmsstal: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Alagoas
	icmsstam: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Amazonas
	icmsstap: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Amapá
	icmsstba: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado da Bahia
	icmsstce: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Ceara
	icmsstdf: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Distrito Federal
	icmsstes: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Espirito Santo
	icmsstex: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o exterior
	icmsstgo: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de Goias
	icmsstma: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Maranhã
	icmsstmg: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de Minas Gerais
	icmsstms: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Mato Grosso do Sul
	icmsstmt: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Mato Grosso
	icmsstpa: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Pará
	icmsstpb: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado da Paraiba
	icmsstpe: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Pernambuco
	icmsstpi: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Piauí
	icmsstpr: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Paraná
	icmsstrj: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Rio de Janeiro
	icmsstrn: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Rio Grande do Norte
	icmsstro: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de Rondonia
	icmsstrr: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de Roraima
	icmsstrs: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Rio Grande do Sul
	icmsstsc: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de Santa Catarina
	icmsstse: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de Sergipe
	icmsstsp: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado de São Paulo
	icmsstto: numeric({ precision: 5, scale: 2 }), // Percentual do ICMS de substituição para o estado do Tocantins
	icmsto: numeric({ precision: 5, scale: 2 }), // Percentual de ICMS para o estado do Tocantins
	idajusteapuracaoicmsdevoluc: bigint({ mode: "number" }), // Ajuste apuração do ICMS para devolução
	idajusteapuracaoipidevoluc: bigint({ mode: "number" }), // Ajuste apuração do IPI para devolução
	idajustedocfiscalcreditoicms: bigint({ mode: "number" }), // Ajuste do documento fiscal para crédito de ICMS
	idbasecalculocredito: bigint({ mode: "number" }), // Base de cálculo de credito
	idcondicaopagamento: bigint({ mode: "number" }), // ID da condição de pagamento
	idcontribuicaosocialapurada: bigint({ mode: "number" }), // Contribuição social apurada
	idcontribuicaosocialapurcofins: bigint({ mode: "number" }), // Contribuição social apurada cofins
	idenquadramentoipientrada: bigint({ mode: "number" }), // ID do enquadramento de IPI de entrada
	idenquadramentoipisaida: bigint({ mode: "number" }), // ID do enquadramento de IPI de saída
	identidadeoperacaofiscal: bigint({ mode: "number" }), // ID da entidade da operação fiscal
	idestadodestino: bigint({ mode: "number" }), // ID do estado destino
	idestadoorigem: bigint({ mode: "number" }), // ID do estado origem
	idfilial: bigint({ mode: "number" }), // ID da filial de origem
	idincentivofiscalorigem: bigint({ mode: "number" }), // ID do incentivo fiscal origem
	idnaturezadevolucao: bigint({ mode: "number" }), // ID da natureza de operação de devolução do cliente
	idnaturezanaocontribuinte: bigint({ mode: "number" }), // ID da natureza de operação não contribuinte
	idnaturezaoperacaoinversa: bigint({ mode: "number" }), // ID da natureza de operação inversa
	idnbs: bigint({ mode: "number" }), // ID da Nomenclatura Comum do Mercosul
	idobslancfiscalcreditoicms: bigint({ mode: "number" }), // Observação do lançamento fiscal para crédito de ICMS
	idoperacaofiscal: bigint({ mode: "number" }), // ID da operação fiscal
	idplanocontas: bigint({ mode: "number" }), // ID do plano de contas
	idreceitasemcontribuicao: bigint({ mode: "number" }), // Receita sem contribuição
	idtipocredito: bigint({ mode: "number" }), // Tipo de crédito
	idtipodocumentofinanceiro: bigint({ mode: "number" }), // ID do tipo de documento financeiro
	idtipoentidadeopfiscal: bigint({ mode: "number" }), // Tipo de cliente para operação fiscal
	importacao: smallint(), // CFOP é de importação
	inativa: smallint(), // Inativa
	informartotaismanualmente: smallint(), // Permitir informar totais de impostos manualmente
	integracao: smallint(), // Integração com o financeiro 0=Sem;1=Contas a receber;2=Contas a pagar
	interestadualdestmesmauf: smallint(), // Permite CFOP interestadual para destinatário da mesma UF e CNPJ
	iss: numeric({ precision: 7, scale: 4 }), // Percentual do ISS
	modocalculoipientrada: smallint(), // Modo de cálculo do IPI de entrada
	modocalculoipisaida: smallint(), // Modo de cálculo do IPI de saída
	movimentoregistroc170: smallint(), // Define a movimentaçãoo do item no registro como 1 (não teve)
	multiplicadorbaseicms: numeric({ precision: 12, scale: 6 }), // Multiplicador de base de ICMS
	naoabaterfcpinternofcpst: smallint(), // Não abater FCP interno do FCP ST
	naoaplicarmva: smallint(), // Não aplicar MVA
	naobaixarestoque: smallint(), // Nao baixar estoque
	naoconsiddescontobaseicms: smallint(), // Não considera desconto na base do ICMS
	naoconsiddescontobaseicmsst: smallint(), // Não considera desconto na base do PIS/COFINS
	naoconsiddescontobasepiscofins: smallint(), // Não considera desconto na base do ICMS ST
	naoconsiddescontocontsocial: smallint(), // Não considerar desconto na base da Contribuição Social
	naoconsiddescontoimpostorenda: smallint(), // Não considerar desconto na base do IR
	naoconsiddescontoinss: smallint(), // Não considerar desconto na base do INSS
	naoconsiddescontoiss: smallint(), // Não considerar desconto na base do ISS
	naoconsiddescpiscofinsretido: smallint(), // Retem INSS de serviço
	naoconsiderafretebaseicms: smallint(), // Não considerar frete na base de cálculo de ICMS
	naoconsiderafretebaseicmsst: smallint(), // Não considerar frete na base de cálculo de ICMS ST
	naoconsideraoutdespbaseicms: smallint(), // Não considerar outras despesas na base de cálculo de ICMS
	naoconsiderapiscofinsproduto: smallint(), // Não considera PIS/COFINS do produto (considera da cfop)
	naoconsiderarvlnotafiscalitem: varchar({ length: 3 }), // Não considerar valor da nota fiscal item
	naoconsideratribespecproduto: smallint(), // Indica se a tributação especial indicada no produto será considerada na incusão na nota fiscal
	naoconsidfretebasepiscofins: smallint(), // Nota complementar
	naoconsidoutdespbasepiscofins: smallint(), // Nota complementar
	naoconsidoutrasdespbaseicmsst: smallint(), // Não considera outras despesas na base do ICMS ST
	naoconsidsegbasepiscofins: smallint(), // Nota complementar
	naogeracreditopiscofins: smallint(), // Não gerar crédito PIS/COFINS
	naomostrarreducaoicmsst: smallint(), // Não mostrar reduçao de ICMS ST
	naosomarfretenototal: smallint(), // Não somar frete no valor total
	notacomplementar: smallint(), // Nota complementar
	observacaoitemnotafiscal: text(), // Observação padrão na impressão do item da NF
	observacaonotafiscal: text(), // Observação padrão na impressão da NF
	observacaonotafiscalfisco: text(), // Observação padrão na impressão da NF
	operacaocomcreditodeestimulo: smallint(), // Operação com crédito de estímulo
	ordemoperacaofiscal: smallint(), // Ordem da operação fiscal
	percaproveitamentoicmslc123: numeric({ precision: 7, scale: 4 }), // % aproveitamento ICMS LC123
	perccontribuicaosocial: numeric({ precision: 5, scale: 2 }), // Percentual de contribuição social
	percentualfunrural: numeric({ precision: 5, scale: 2 }), // Percentual FUNRURAL
	percentualpartilhadifal: numeric({ precision: 5, scale: 2 }), // % Partilha DIFAL
	percimpostorenda: numeric({ precision: 5, scale: 2 }), // Percentual de imposto de renda
	percinss: numeric({ precision: 5, scale: 2 }), // Percentual de INSS
	percreducaoinss: numeric({ precision: 5, scale: 2 }), // % de Redução de INSS
	permitecreditopiscofinspf: smallint(), // Permite crédito de PIS/COFINS para pessoa física
	permitenfnormalsomentealiqicms: smallint(), // Permitir nota fiscal somente com % de ICMS
	permitenotasemvalor: smallint(), // Nota sem valor
	permitirbaixarlotevencido: smallint(), // Permitir baixar estoque de lote vencido em modo PEPS
	permitircfopinternaopexterior: smallint(), // Permite CFOP interna para operação com exterior
	posseitem: varchar({ length: 1 }), // Remessa para terceiros
	possuiincentivosfiscais: smallint(), // Possui incentivos fiscais
	possuirepasseicmsst: smallint(), // Possui repasse para o ICMS ST
	presencaconsumidor: smallint(), // Presença do consumidor
	reducaoicmsac: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Acre
	reducaoicmsal: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Alagoas
	reducaoicmsam: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Amazonas
	reducaoicmsap: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Amapá
	reducaoicmsba: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado da Bahia
	reducaoicmsce: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Ceara
	reducaoicmsdf: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Distrito Federal
	reducaoicmses: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Espirito Santo
	reducaoicmsex: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o exterior
	reducaoicmsgo: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de Goias
	reducaoicmsma: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Maranhã
	reducaoicmsmg: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de Minas Gerais
	reducaoicmsms: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Mato Grosso do Sul
	reducaoicmsmt: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Mato Grosso
	reducaoicmspa: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Pará
	reducaoicmspb: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado da Paraiba
	reducaoicmspe: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Pernambuco
	reducaoicmspi: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Piauí
	reducaoicmspr: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Paraná
	reducaoicmsrj: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Rio de Janeiro
	reducaoicmsrn: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Rio Grande do Norte
	reducaoicmsro: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de Rondonia
	reducaoicmsrr: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de Roraima
	reducaoicmsrs: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Rio Grande do Sul
	reducaoicmssc: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de Santa Catarina
	reducaoicmsse: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de Sergipe
	reducaoicmssp: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado de São Paulo
	reducaoicmsstac: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Acre
	reducaoicmsstal: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Alagoas
	reducaoicmsstam: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Amazonas
	reducaoicmsstap: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Amapá
	reducaoicmsstba: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado da Bahia
	reducaoicmsstce: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Ceara
	reducaoicmsstdf: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Distrito Federal
	reducaoicmsstes: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Espirito Santo
	reducaoicmsstex: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o exterior
	reducaoicmsstgo: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de Goias
	reducaoicmsstma: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Maranhã
	reducaoicmsstmg: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de Minas Gerais
	reducaoicmsstms: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Mato Grosso do Sul
	reducaoicmsstmt: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Mato Grosso
	reducaoicmsstpa: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Pará
	reducaoicmsstpb: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado da Paraiba
	reducaoicmsstpe: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Pernambuco
	reducaoicmsstpi: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Piauí
	reducaoicmsstpr: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Paraná
	reducaoicmsstrj: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Rio de Janeiro
	reducaoicmsstrn: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Rio Grande do Norte
	reducaoicmsstro: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de Rondonia
	reducaoicmsstrr: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de Roraima
	reducaoicmsstrs: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Rio Grande do Sul
	reducaoicmsstsc: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de Santa Catarina
	reducaoicmsstse: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de Sergipe
	reducaoicmsstsp: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado de São Paulo
	reducaoicmsstto: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS de substituição para o estado do Tocantins
	reducaoicmsto: numeric({ precision: 9, scale: 6 }), // Percentual de redução do ICMS para o estado do Tocantins
	reducaoiss: numeric({ precision: 7, scale: 4 }), // Percentual de redução do ISS
	regimeespecial: smallint(), // Documento fiscal emitido com base em regime especial ou norma especifica
	registrarproducaovenda: smallint(), // Registrar produção na venda
	retencaoiss: numeric({ precision: 7, scale: 4 }), // Retenção do ISS
	retercontribuicaosocial: smallint(), // Retem contribuição social de serviço
	reterimpostorenda: smallint(), // Retem imposto de renda de serviço
	reterinss: smallint(), // Retem INSS de serviço
	reterpiscofins: smallint(), // Retem PIS/COFINS de serviço
	semrepercussaofiscalpe: smallint(), // Sem repercussão fiscal
	situacaotributaria: varchar({ length: 3 }), // Código da situaçao tributaria do ICMS
	situacaotributariasn: varchar({ length: 3 }), // Código da situaçao tributaria do ICMS do SN
	somarafrmmtotal: smallint(), // Somar AFRMM no valor total
	somarcofinsoutrasdesp: smallint(), // Somar COFINS nas outras despesas
	somarcofinstotal: smallint(), // Somar valor do COFINS no total da nota fiscal
	somardespacesoutrasdesp: smallint(), // Somar despesas acessórias nas outras despesas
	somardespesasaduaneirastotal: smallint(), // Somar valor das despesas aduaneiras no total da nota fiscal
	somaricmsoutrasdesp: smallint(), // Somar ICMS nas outras despesas
	somaricmstotal: smallint(), // Somar valor do ICMS no total da nota fiscal
	somariitotalproduto: smallint(), // Indica se o valor do imposto de importação irá somar no total dos produtos
	somarpisoutrasdesp: smallint(), // Somar PIS nas outras despesas
	somarpistotal: smallint(), // Somar valor do PIS no total da nota fiscal
	somarsiscomexoutrasdesp: smallint(), // Somar taxa SISCOMEX nas outras despesas
	somarsiscomextotal: smallint(), // Somar valor do SISCOMEX no total da nota fiscal
	tipocalculoicmsretant: smallint(), // Buscar ICMS ST cobrado anteriormente
	tipoenquadramento: smallint(), // Tipo de enquadramento fiscal
	tipoenquadramentoorigem: smallint(), // Tipo de enquadramento fiscal
	tipoproduto: varchar({ length: 2 }), // Tipo de produto
	tiporemessaemterceiros: smallint(), // Tipo de remessa em terceiros
	tipovalorpreco: smallint(), // Tipo do valor do preço unitário na nota fiscal
	tributacaoespecial: varchar({ length: 6 }), // Identificador de tributação especial
	tributacaoservico: varchar({ length: 7 }), // Tributação pafa o PAF-ECF
	tributamunicipioprestador: smallint(), // Indica se serviço é tributado no município de origem
	utilizartodasoperacoes: smallint(), // Utilizar em todas as operações
	valorminimoretencao: numeric({ precision: 12, scale: 2 }), // Valor mínimo das retenções
	zerarfcpterceiros: smallint(), // Zerar FCP em nota de entrada de terceiros
});
