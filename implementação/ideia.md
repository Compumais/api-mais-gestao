Pensou por 52s

Projeto técnico — Módulo de Cobrança Bancária do Mais Gestão

Arquitetura proposta Node.js + TypeScript + Drizzle ORM Multiempresa



A proposta é construir um Banking Gateway interno, responsável por centralizar a comunicação do Mais Gestão com instituições financeiras.



O módulo será independente das particularidades de cada banco. O financeiro solicitará a emissão de uma cobrança e o gateway decidirá como executar a operação: API REST ou CNAB.



A arquitetura deverá permitir adicionar novos bancos sem alterar as regras de contas a receber.



1\. Decisões arquiteturais

Minha recomendação é utilizar um monólito modular com processamento assíncrono, mantendo a API e o worker como processos separados.



Não começaria com microsserviços. Para o estágio atual do projeto, isso acrescentaria complexidade operacional sem trazer um benefício proporcional.



Arquitetura geral

Mais Gestão — Frontend



Financeiro · Contas a receber · Cadastro bancário · Cobranças



REST API



Backend — API Node.js



Banking Controller



Endpoints



Application Services



Regras de negócio



Provider Registry



Seleção do banco



Event / Outbox



Processamento assíncrono



Banking Gateway



API Adapter



REST · OAuth · Tokens · HTTP



CNAB Engine



Remessa · Retorno · Layouts



Banco do Brasil



API / CNAB



Sicredi



API / CNAB



Sicoob



API / CNAB



PostgreSQL



Drizzle ORM · Histórico · Títulos



Redis / BullMQ



Fila de processamento e retentativas



Componentes principais

Componente



Responsabilidade



Banking Controller



Receber requisições do ERP



Banking Service



Regras de cobrança



Provider Registry



Localizar o adaptador bancário



API Adapter



Comunicação REST com bancos



CNAB Engine



Gerar e interpretar arquivos



Banking Worker



Executar operações assíncronas



Reconciliation Service



Conciliar liquidações



Webhook Handler



Receber notificações bancárias



Audit Service



Registrar operações e alterações



Tecnologias sugeridas:



Node.js + TypeScript.



Drizzle ORM.



PostgreSQL.



Redis + BullMQ.



Axios ou cliente HTTP nativo com suporte a TLS.



Zod para validação.



Decimal.js para cálculos monetários.



Pino para logs.



Armazenamento privado de arquivos compatível com S3.



2\. Estrutura de diretórios

Eu isolaria o módulo dentro do backend existente, evitando espalhar código bancário pelo restante do projeto.



src/

├── modules/

│   └── banking/

│       ├── application/

│       │   ├── services/

│       │   │   ├── create-slip.service.ts

│       │   │   ├── register-slip.service.ts

│       │   │   ├── cancel-slip.service.ts

│       │   │   ├── update-slip.service.ts

│       │   │   ├── reconcile-slip.service.ts

│       │   │   └── import-return.service.ts

│       │   ├── dto/

│       │   └── validators/

│       │

│       ├── domain/

│       │   ├── entities/

│       │   ├── enums/

│       │   ├── errors/

│       │   ├── interfaces/

│       │   └── rules/

│       │

│       ├── infrastructure/

│       │   ├── providers/

│       │   │   ├── bb/

│       │   │   │   ├── bb.api.ts

│       │   │   │   ├── bb.auth.ts

│       │   │   │   ├── bb.mapper.ts

│       │   │   │   └── bb.provider.ts

│       │   │   ├── sicredi/

│       │   │   │   ├── sicredi.api.ts

│       │   │   │   ├── sicredi.auth.ts

│       │   │   │   ├── sicredi.mapper.ts

│       │   │   │   └── sicredi.provider.ts

│       │   │   └── sicoob/

│       │   │       ├── sicoob.api.ts

│       │   │       ├── sicoob.auth.ts

│       │   │       ├── sicoob.mapper.ts

│       │   │       └── sicoob.provider.ts

│       │   │

│       │   ├── cnab/

│       │   │   ├── core/

│       │   │   │   ├── fixed-width.ts

│       │   │   │   ├── file-validator.ts

│       │   │   │   └── cnab-types.ts

│       │   │   ├── layouts/

│       │   │   │   ├── bb/

│       │   │   │   ├── sicredi/

│       │   │   │   └── sicoob/

│       │   │   ├── generators/

│       │   │   └── parsers/

│       │   │

│       │   ├── repositories/

│       │   ├── encryption/

│       │   └── storage/

│       │

│       ├── jobs/

│       │   ├── registration.worker.ts

│       │   ├── return.worker.ts

│       │   ├── reconciliation.worker.ts

│       │   └── webhook.worker.ts

│       │

│       ├── http/

│       │   ├── banking.routes.ts

│       │   ├── banking.controller.ts

│       │   └── webhook.routes.ts

│       │

│       └── banking.module.ts

│

└── workers/

&#x20;   └── banking.worker.ts

Uma observação importante: os diretórios de cada banco devem conter apenas as particularidades daquele banco. As regras comuns ficam em domain, application e cnab/core.



Assim, um novo banco não exige copiar toda a estrutura dos outros.



3\. Modelagem do banco de dados

A modelagem precisa considerar que uma empresa pode possuir:



Várias contas bancárias.



Mais de um convênio na mesma conta.



Diferentes modalidades de integração.



Ambientes de homologação e produção.



Vários boletos vinculados às contas a receber.



3.1 Entidades principais

Relacionamento das entidades

companies



Empresa / Tenant



bank\_connections



Conexão bancária



bank\_agreements



Convênios



bank\_slips



Títulos bancários registrados ou pendentes



bank\_slip\_events



Eventos e histórico



bank\_commands



Operações solicitadas



bank\_remittances



Remessas



bank\_returns



Retornos



3.2 Tabelas

Tabela



Campos importantes



bank\_connections



company\_id, bank\_code, transport, environment, status



bank\_agreements



connection\_id, convenio, carteira, modalidade, nosso\_numero\_config



bank\_credentials



connection\_id, credential\_type, encrypted\_value



bank\_slips



company\_id, receivable\_id, agreement\_id, nosso\_numero, valor, vencimento, status



bank\_slip\_events



slip\_id, event\_type, event\_date, payload



bank\_commands



slip\_id, operation, idempotency\_key, status



bank\_remittances



connection\_id, sequence, filename, checksum, status



bank\_remittance\_items



remittance\_id, slip\_id, processing\_status



bank\_returns



connection\_id, filename, checksum, imported\_at



bank\_return\_items



return\_id, nosso\_numero, occurrence\_code, processing\_status



bank\_webhook\_events



connection\_id, external\_event\_id, payload, processed\_at



bank\_audit\_logs



company\_id, user\_id, action, metadata



Regras fundamentais da modelagem

Todas as entidades operacionais devem ter company\_id, diretamente ou por relacionamento validado.



Nunca consultar um boleto apenas pelo ID sem validar a empresa proprietária.



O nosso\_numero deve ser único dentro do escopo exigido pelo banco/convênio.



Não sobrescrever o histórico de eventos.



Guardar o payload original do banco para auditoria.



Armazenar valores monetários como numeric ou centavos inteiros, nunca como float.



Manter credenciais separadas dos dados operacionais.



3.3 Exemplo de schema Drizzle

Abaixo, uma base inicial usando PostgreSQL:





import {

&#x20; pgTable,

&#x20; uuid,

&#x20; varchar,

&#x20; text,

&#x20; numeric,

&#x20; timestamp,

&#x20; jsonb,

&#x20; integer,

&#x20; boolean,

&#x20; uniqueIndex,

&#x20; index,

} from "drizzle-orm/pg-core";



export const bankConnections = pgTable(

&#x20; "bank\_connections",

&#x20; {

&#x20;   id: uuid("id").defaultRandom().primaryKey(),



&#x20;   companyId: uuid("company\_id").notNull(),



&#x20;   bankCode: varchar("bank\_code", { length: 3 }).notNull(),

&#x20;   transport: varchar("transport", { length: 10 }).notNull(),

&#x20;   environment: varchar("environment", { length: 15 })

&#x20;     .notNull(),



&#x20;   accountNumber: varchar("account\_number", { length: 30 }),

&#x20;   branchNumber: varchar("branch\_number", { length: 20 }),



&#x20;   config: jsonb("config").$type<Record<string, unknown>>(),



&#x20;   status: varchar("status", { length: 20 })

&#x20;     .notNull()

&#x20;     .default("inactive"),



&#x20;   createdAt: timestamp("created\_at", {

&#x20;     withTimezone: true,

&#x20;   }).defaultNow().notNull(),



&#x20;   updatedAt: timestamp("updated\_at", {

&#x20;     withTimezone: true,

&#x20;   }).defaultNow().notNull(),

&#x20; },

&#x20; (table) => \[

&#x20;   index("bank\_connections\_company\_idx").on(table.companyId),

&#x20; ]

);



export const bankSlips = pgTable(

&#x20; "bank\_slips",

&#x20; {

&#x20;   id: uuid("id").defaultRandom().primaryKey(),



&#x20;   companyId: uuid("company\_id").notNull(),

&#x20;   connectionId: uuid("connection\_id").notNull(),

&#x20;   agreementId: uuid("agreement\_id").notNull(),



&#x20;   receivableId: uuid("receivable\_id").notNull(),



&#x20;   nossoNumero: varchar("nosso\_numero", { length: 40 }),

&#x20;   externalId: varchar("external\_id", { length: 100 }),



&#x20;   payerDocument: varchar("payer\_document", { length: 20 })

&#x20;     .notNull(),



&#x20;   payerName: varchar("payer\_name", { length: 150 })

&#x20;     .notNull(),



&#x20;   amount: numeric("amount", {

&#x20;     precision: 15,

&#x20;     scale: 2,

&#x20;   }).notNull(),



&#x20;   dueDate: timestamp("due\_date", {

&#x20;     withTimezone: true,

&#x20;   }).notNull(),



&#x20;   digitableLine: varchar("digitable\_line", { length: 100 }),

&#x20;   barcode: varchar("barcode", { length: 100 }),



&#x20;   pixPayload: text("pix\_payload"),



&#x20;   status: varchar("status", { length: 30 })

&#x20;     .notNull()

&#x20;     .default("pending\_registration"),



&#x20;   rawResponse: jsonb("raw\_response"),



&#x20;   createdAt: timestamp("created\_at", {

&#x20;     withTimezone: true,

&#x20;   }).defaultNow().notNull(),



&#x20;   updatedAt: timestamp("updated\_at", {

&#x20;     withTimezone: true,

&#x20;   }).defaultNow().notNull(),

&#x20; },

&#x20; (table) => \[

&#x20;   index("bank\_slips\_company\_idx").on(table.companyId),

&#x20;   index("bank\_slips\_receivable\_idx").on(table.receivableId),

&#x20;   index("bank\_slips\_status\_idx").on(table.status),

&#x20;   uniqueIndex("bank\_slips\_connection\_nosso\_numero\_uq")

&#x20;     .on(table.connectionId, table.nossoNumero),

&#x20; ]

);



Esse código é um esqueleto, não uma migration pronta. As relações devem ser completadas com as tabelas reais de empresas e contas a receber do projeto.



Importante: não aplique unicidade global ao nosso número. O escopo correto depende das regras de numeração do convênio. Também recomendo chaves estrangeiras compostas ou validações transacionais que impeçam referências cruzadas entre empresas.



Estados dos boletos

Eu utilizaria estados internos normalizados:



Ciclo de vida do boleto

PENDING\_REGISTRATION



Cobrança criada no ERP, aguardando envio ao banco.



PROCESSING



Requisição enviada ou remessa em processamento.



REGISTERED



Banco confirmou o registro.



REGISTRATION\_REJECTED



Banco rejeitou o registro.



PAID



Pagamento liquidado e confirmado.



CANCEL\_REQUESTED



Solicitação de baixa enviada.



CANCELLED



Baixa confirmada pelo banco.



Estados adicionais: EXPIRED, PROTESTED, PAYMENT\_PARTIAL (quando suportado), UNKNOWN e outros conforme o domínio. Vencido pode ser calculado pela data e não precisa ser um estado definitivo.



Nunca considere um boleto registrado apenas porque a API retornou HTTP 200. É necessário interpretar o conteúdo da resposta e validar o resultado de negócio.



4\. Contrato dos Providers

Esta é uma das partes mais importantes do projeto.



O financeiro não deve saber se está conversando com BB, Sicredi ou Sicoob. Ele deve conhecer apenas operações padronizadas.



4.1 Interface principal

Sugiro criar os contratos em domain/interfaces/bank-provider.interface.ts.





export type BankCode = "001" | "748" | "756";



export type BankTransport = "API" | "CNAB";



export type BankEnvironment = "SANDBOX" | "PRODUCTION";



export interface BankSlipInput {

&#x20; agreementId: string;

&#x20; nossoNumero?: string;



&#x20; amount: string;

&#x20; dueDate: string;



&#x20; payer: {

&#x20;   name: string;

&#x20;   document: string;

&#x20;   email?: string;

&#x20;   address?: {

&#x20;     street: string;

&#x20;     number: string;

&#x20;     neighborhood: string;

&#x20;     city: string;

&#x20;     state: string;

&#x20;     zipCode: string;

&#x20;   };

&#x20; };



&#x20; instructions?: {

&#x20;   discount?: string;

&#x20;   interest?: string;

&#x20;   fine?: string;

&#x20; };



&#x20; documentNumber: string;

&#x20; documentType: string;

&#x20; description?: string;

}



export interface BankSlipResult {

&#x20; success: boolean;



&#x20; externalId?: string;

&#x20; nossoNumero?: string;



&#x20; barcode?: string;

&#x20; digitableLine?: string;



&#x20; pixPayload?: string;



&#x20; status:

&#x20;   | "REGISTERED"

&#x20;   | "PENDING"

&#x20;   | "REJECTED"

&#x20;   | "UNKNOWN";



&#x20; bankCode: BankCode;



&#x20; rawResponse?: unknown;



&#x20; errors?: Array<{

&#x20;   code: string;

&#x20;   message: string;

&#x20;   field?: string;

&#x20; }>;

}



export interface BankSlipStatus {

&#x20; status: string;

&#x20; paidAt?: string;

&#x20; paidAmount?: string;

&#x20; bankOccurrenceCode?: string;

&#x20; rawResponse?: unknown;

}



export interface BankProvider {

&#x20; readonly bankCode: BankCode;



&#x20; registerSlip(

&#x20;   input: BankSlipInput,

&#x20;   connectionId: string

&#x20; ): Promise<BankSlipResult>;



&#x20; getSlip(

&#x20;   nossoNumero: string,

&#x20;   connectionId: string

&#x20; ): Promise<BankSlipStatus>;



&#x20; cancelSlip(

&#x20;   nossoNumero: string,

&#x20;   connectionId: string

&#x20; ): Promise<BankSlipResult>;



&#x20; updateSlip(

&#x20;   nossoNumero: string,

&#x20;   changes: Partial<BankSlipInput>,

&#x20;   connectionId: string

&#x20; ): Promise<BankSlipResult>;

}



O contrato acima representa a interface de operações online. Para CNAB, teremos outro contrato específico.



4.2 Contrato do CNAB



export interface CnabProvider {

&#x20; readonly bankCode: BankCode;



&#x20; generateRemittance(

&#x20;   items: BankSlipInput\[],

&#x20;   agreementId: string

&#x20; ): Promise<{

&#x20;   content: Buffer;

&#x20;   filename: string;

&#x20;   sequence: number;

&#x20;   itemCount: number;

&#x20;   checksum: string;

&#x20; }>;



&#x20; parseReturn(

&#x20;   file: Buffer,

&#x20;   agreementId: string

&#x20; ): Promise<CnabReturnResult>;



&#x20; validateRemittance(

&#x20;   file: Buffer,

&#x20;   agreementId: string

&#x20; ): Promise<{

&#x20;   valid: boolean;

&#x20;   errors: string\[];

&#x20; }>;

}



export interface CnabReturnResult {

&#x20; bankCode: BankCode;

&#x20; sequence?: number;



&#x20; items: Array<{

&#x20;   nossoNumero: string;

&#x20;   occurrenceCode: string;

&#x20;   occurrenceDescription: string;

&#x20;   eventDate?: string;

&#x20;   paidAmount?: string;

&#x20;   paidAt?: string;

&#x20;   rawRecord: string;

&#x20; }>;

}



A separação é proposital:



API trabalha com requisições e respostas.



CNAB trabalha com arquivos, lotes e ocorrências.



Ambos atualizam o mesmo modelo de títulos e eventos.



Não force o CNAB a fingir que é uma API REST. São processos diferentes.



4.3 Provider Registry

O Registry será responsável por selecionar a implementação correta.





const bankProviders = new Map<string, BankProvider>();



export function registerBankProvider(

&#x20; provider: BankProvider

) {

&#x20; bankProviders.set(provider.bankCode, provider);

}



export function getBankProvider(

&#x20; bankCode: string

): BankProvider {

&#x20; const provider = bankProviders.get(bankCode);



&#x20; if (!provider) {

&#x20;   throw new Error(

&#x20;     `Provider bancário não encontrado: ${bankCode}`

&#x20;   );

&#x20; }



&#x20; return provider;

}



// Registro dos providers

registerBankProvider(new BancoBrasilProvider());

registerBankProvider(new SicrediProvider());

registerBankProvider(new SicoobProvider());



Na implementação real, o Registry deve considerar também a modalidade de transporte e a versão do provider.



Exemplo:



getBankAdapter({

&#x20; bankCode: "748",

&#x20; transport: "API",

&#x20; environment: "PRODUCTION",

});



Isso evita misturar a configuração de uma conta Sicredi via API com outra conta Sicredi via CNAB.



5\. Particularidades técnicas de cada banco

Aqui é importante não criar uma abstração excessivamente genérica.



Os bancos compartilham o conceito de boleto, mas suas autenticações, campos, convênios, respostas e regras são diferentes.



5.1 Banco do Brasil — código 001

CIAB 2019 | Banco do Brasil está testando atendimento em realidade virtual - Canaltech



Banco do Brasil



API Cobranças v2 · CNAB



API oficial: Portal de Apoio ao Desenvolvedor BB.



Principais operações:



Operação



Recurso



Registrar



POST /boletos



Consultar



GET /boletos/{id}



Listar



Consulta de boletos



Baixar



Recurso de baixa/instrução



Webhook



Eventos de cobrança, conforme habilitação



A documentação apresenta os ambientes de homologação e produção e os requisitos de autenticação, parâmetros de convênio e carteira. 



Portal de Apoio ao Desenvolvedor BB

+1



Implementação sugerida:



OAuth 2.0 e gerenciamento de tokens.



App Key.



Número do convênio.



Carteira e variação da carteira.



Modalidade de cobrança.



Nosso número.



Tratamento de códigos de retorno do BB.



No CNAB, o BB publica layouts próprios, incluindo CNAB 240 e arquivos específicos de cobrança CNAB 400. 



Portal BB



5.2 Sicredi — código 748

Logo Sicredi – Logos PNG



Sicredi



API de Cobrança · CNAB 240/400



Documentação:



Visão geral das APIs Sicredi.



Cadastro de boleto.



CNAB 240.



CNAB 400.



Uma particularidade relevante: a API de cobrança utiliza OAuth 2.0 com fluxo password, além de uma chave de aplicação e código de acesso vinculado à conta. Não se deve assumir que o mesmo modelo de autenticação utilizado por outras APIs Sicredi será válido para cobrança. 



Docs Pública

+1



A API permite registrar boletos tradicionais e híbridos. Um detalhe documentado: determinados parâmetros de início de juros e multa podem fazer a cobrança ser convertida para modalidade tradicional, em vez de híbrida. 



Docs Pública

+1



Implementação sugerida:



Autenticação isolada por conta.



Código do beneficiário.



Código de acesso.



Client ID e chave de aplicação.



Controle de modalidade NORMAL/HIBRIDO.



Tratamento de limites de requisição.



Parser CNAB 240 e 400.



5.3 Sicoob — código 756

FAZENDA TRÊS RIACHOS, COM ÁREA TOTAL DE 1.630,5412 HÁ SANTA FÉ MG



Sicoob



API Cobrança Bancária · CNAB



Documentação: Portal oficial para desenvolvedores Sicoob.



O Sicoob oferece API de cobrança bancária e suporte a integração por arquivos CNAB. 



Sicoob

+1



Implementação sugerida:



Gerenciamento de credenciais e certificados conforme exigência do serviço contratado.



Client ID.



Número do contrato/convênio.



Configuração de conta e cooperativa.



Consulta e registro de boletos.



Instruções de baixa e alteração, conforme recursos liberados.



Processamento CNAB.



A documentação e o cadastro da aplicação devem ser consultados diretamente no portal, pois as credenciais, os requisitos de conexão e as versões disponíveis podem variar conforme o serviço habilitado.



Não fixaria URLs, versões ou fluxo de autenticação do Sicoob no código antes de validar a especificação vigente e a homologação da API contratada.



6\. Processamento de emissão

O fluxo deve ser assíncrono.



O usuário não precisa ficar esperando a resposta do banco enquanto o ERP segura a requisição HTTP aberta.



Fluxo de emissão via API

Banco

Banking Worker

BullMQ

PostgreSQL

Mais Gestão API

Usuário

Banco

Banking Worker

BullMQ

PostgreSQL

Mais Gestão API

Usuário

Solicita emissão

Cria título pendente

Registra comando e outbox

Retorna ID e status PROCESSING

Publica operação

Processa emissão

Busca configuração e credenciais

Registra boleto

Resposta bancária

Atualiza título e evento

Atualiza comando

Regras de processamento

Uma emissão deve ter uma chave de idempotência.



Um título não pode ser registrado duas vezes por uma repetição de requisição.



Erros de conexão não significam necessariamente que o banco não registrou o boleto.



Em caso de timeout após envio, o sistema deve consultar o banco antes de repetir o registro.



A confirmação deve atualizar o título somente após validação da resposta bancária.



Muito importante: se ocorrer timeout depois que o banco recebeu a solicitação, não faça um novo POST /boletos às cegas. Você pode acabar emitindo dois boletos para a mesma parcela.



Fluxo CNAB

Selecionar títulos pendentes

Validar convênio

Gerar arquivo CNAB

Validar posições e registros

Salvar arquivo e checksum

Marcar títulos em remessa

Disponibilizar para envio

Cliente envia ao banco

Banco processa remessa

Cliente importa retorno

Validar arquivo e duplicidade

Interpretar ocorrências

Atualizar títulos e eventos

Conciliar contas a receber

Na primeira versão, eu faria o envio e recebimento de arquivos de maneira manual pelo ERP, com importação e exportação. Posteriormente podemos adicionar SFTP ou outro canal autorizado pelo banco.



O arquivo precisa ser tratado como uma operação financeira, não apenas como um documento para download.



Cada remessa deve possuir:



Número sequencial.



Convênio e conta de origem.



Hash SHA-256.



Quantidade de títulos.



Valor total.



Data de geração.



Status de envio.



Relação dos títulos incluídos.



A importação de retorno deve ser idempotente. O mesmo arquivo não pode liquidar duas vezes o mesmo título.



7\. APIs internas do Mais Gestão

Eu criaria um namespace específico:



/api/v1/banking



As rotas devem obter a empresa pelo contexto de autenticação do usuário, validando a autorização em todas as operações. Não basta aceitar um companyId enviado pelo frontend.



7.1 Cadastro bancário

Método



Endpoint



Função



GET



/connections



Listar conexões



POST



/connections



Criar conexão



GET



/connections/:id



Consultar conexão



PUT



/connections/:id



Atualizar configuração



DELETE



/connections/:id



Desativar conexão



POST



/connections/:id/test



Testar conectividade



GET



/connections/:id/capabilities



Recursos disponíveis



7.2 Boletos

Método



Endpoint



Função



POST



/slips



Solicitar emissão



GET



/slips



Listar boletos



GET



/slips/:id



Consultar boleto



POST



/slips/:id/register



Solicitar registro



POST



/slips/:id/cancel



Solicitar baixa



PATCH



/slips/:id



Alterar dados permitidos



GET



/slips/:id/events



Histórico



GET



/slips/:id/pdf



Obter PDF



7.3 Remessas e retornos

Método



Endpoint



Função



POST



/remittances



Gerar remessa



GET



/remittances



Listar remessas



GET



/remittances/:id



Consultar remessa



GET



/remittances/:id/download



Baixar arquivo



POST



/returns/import



Importar retorno



GET



/returns



Consultar retornos



GET



/returns/:id



Detalhar retorno



7.4 Conciliação

Método



Endpoint



Função



POST



/reconciliation/run



Executar conciliação



GET



/reconciliation/pending



Pendências



GET



/reconciliation/history



Histórico



POST



/reconciliation/:id/confirm



Confirmar conciliação manual



Exemplo de requisição para emissão

POST /api/v1/banking/slips

Authorization: Bearer TOKEN

Idempotency-Key: 9c4c0f5a-...

Content-Type: application/json

{

&#x20; "connectionId": "uuid-da-conexao",

&#x20; "agreementId": "uuid-do-convenio",

&#x20; "receivableId": "uuid-da-conta-receber",

&#x20; "dueDate": "2026-12-10",

&#x20; "amount": "450.00",

&#x20; "payer": {

&#x20;   "name": "Cliente Exemplo",

&#x20;   "document": "12345678000199",

&#x20;   "email": "cliente@exemplo.com"

&#x20; },

&#x20; "documentNumber": "FAT-1025",

&#x20; "documentType": "DUPLICATA\_MERCANTIL"

}



Resposta:



{

&#x20; "success": true,

&#x20; "data": {

&#x20;   "id": "uuid-do-boleto",

&#x20;   "status": "PROCESSING",

&#x20;   "message": "Solicitação de registro recebida"

&#x20; }

}



O frontend pode consultar o estado do título por polling ou receber atualização por WebSocket/SSE, se já houver essa infraestrutura no projeto.



8\. Configuração multiempresa e segurança

Este é um ponto crítico porque o Mais Gestão será utilizado por várias empresas, cada uma com seus próprios convênios e credenciais.



8.1 Exemplo de configuração

Empresa: Comércio Exemplo Ltda.



Tenant 001



Banco do Brasil



Ativo

Agência 1234 · Conta 56789



Convênio 1234567 · API Produção



Sicredi



Ativo

Agência 0101 · Conta 12345



Beneficiário 12345 · CNAB 240



Sicoob



Homologação

Agência 4001 · Conta 12345



Convênio configurado · API Sandbox



Outra empresa poderá utilizar os mesmos bancos, mas com configurações completamente diferentes.



8.2 Segurança das credenciais

Não armazene Client Secret, senhas, tokens ou chaves privadas diretamente em JSON sem proteção.



Minha proposta:



Criptografia AES-256-GCM para credenciais em repouso.



Chave mestra fora do PostgreSQL, preferencialmente em KMS ou serviço de segredos.



Certificados e chaves privadas em armazenamento privado criptografado.



Tokens OAuth armazenados com validade e renovação controladas.



Separação entre Sandbox e Produção.



Logs com mascaramento de dados sensíveis.



Auditoria de acesso e alterações.



Controle de permissões por empresa.



A API nunca deve devolver credenciais completas ao frontend.



Também precisamos separar dois tipos de credenciais:



Credenciais da aplicação integradora, quando o banco utiliza uma aplicação registrada pelo desenvolvedor.



Credenciais e autorizações específicas do cliente, como convênio, beneficiário, código de acesso, certificado ou autorização de conta.



A arquitetura deve suportar os dois modelos sem presumir que todos os bancos utilizam credenciais exclusivas por empresa.



8.3 Isolamento de dados

Uma regra que eu implementaria desde o primeiro dia:



const slip = await db.query.bankSlips.findFirst({

&#x20; where: and(

&#x20;   eq(bankSlips.id, slipId),

&#x20;   eq(bankSlips.companyId, authenticatedCompanyId)

&#x20; )

});



Nunca:



// ERRADO: não garante isolamento entre empresas

const slip = await db.query.bankSlips.findFirst({

&#x20; where: eq(bankSlips.id, slipId)

});



O isolamento precisa existir em todos os serviços, workers, consultas, arquivos e webhooks.



9\. Tratamento de erros e conciliação financeira

A integração precisa distinguir erros técnicos de ocorrências bancárias.



Situação



Tratamento



Token expirado



Renovar e repetir quando seguro



HTTP 400



Interpretar rejeição e campos



HTTP 401



Revalidar autenticação



HTTP 403



Verificar autorização/convênio



HTTP 429



Respeitar limite e aplicar backoff



HTTP 500



Investigar resultado antes de repetir



Timeout



Consultar título antes de reenviar



Arquivo inválido



Rejeitar importação



Ocorrência desconhecida



Guardar evento para análise



Conciliação

O boleto liquidado não deve apenas mudar de status.



Ele precisa gerar a movimentação correspondente no contas a receber, respeitando as regras financeiras já existentes.



Exemplo:



Conta a receber



Documento



FAT-1025



Valor original



R$ 450,00



Juros



R$ 5,00



Multa



R$ 9,00



Desconto



R$ 0,00



Valor recebido



R$ 464,00

Liquidação confirmada

É necessário separar:



Valor nominal do título.



Valor efetivamente recebido.



Juros.



Multa.



Desconto.



Tarifas bancárias.



Valor líquido creditado na conta.



O valor pago pelo cliente pode ser diferente do valor líquido recebido pelo beneficiário por causa das tarifas bancárias.



Não dê baixa financeira duas vezes. O evento bancário deve ter identificação única e a contabilização precisa ser transacional e idempotente.



Outra regra importante: se o retorno indicar pagamento parcial, divergência de valor ou crédito não identificado, o sistema não deve forçar a baixa integral da parcela. Deve encaminhar para o tratamento financeiro correspondente.



10\. Plano de implementação

Eu dividiria o desenvolvimento em seis etapas, com entregas testáveis.



Roadmap de desenvolvimento

Etapa 1 — Fundação



Prioridade máxima

Criar tabelas Drizzle.



Criar isolamento multiempresa.



Implementar cadastro de conexões e convênios.



Criar criptografia de credenciais.



Criar interfaces e Provider Registry.



Implementar fila e Outbox Pattern.



Entrega: infraestrutura pronta para conectar bancos.



Etapa 2 — Banco do Brasil via API



Autenticação OAuth.



Registro de boletos.



Consulta.



Baixa.



Tratamento de rejeições.



Impressão do boleto.



Testes de homologação.



Entrega: primeiro ciclo bancário funcional.



Etapa 3 — CNAB 240



Engine de geração.



Layout BB.



Validação posicional.



Geração de remessas.



Importação de retornos.



Conciliação.



Entrega: cobrança bancária por arquivos.



Etapa 4 — Sicredi



API de cobrança.



Autenticação específica.



Boleto tradicional e híbrido.



CNAB 240 e 400.



Tratamento de ocorrências.



Entrega: segundo banco integrado.



Etapa 5 — Sicoob



Autenticação e certificados conforme especificação.



Registro e consulta.



Baixa e alterações suportadas.



CNAB 240 e 400, conforme convênio.



Testes de homologação.



Entrega: terceiro banco integrado.



Etapa 6 — Operação e escala



Webhooks.



Rotinas automáticas de consulta.



Dashboard de cobranças.



Conciliação automática.



Alertas de falhas.



Monitoramento e auditoria.



Entrega: módulo pronto para operação em escala.



Critérios de aceite

Antes de liberar cada provider em produção, eu exigiria:



Registro de boleto confirmado pelo banco.



Consulta posterior do mesmo título.



Impressão com linha digitável e código de barras válidos.



Baixa confirmada.



Recebimento de retorno de liquidação.



Prevenção de duplicidade.



Testes com duas empresas usando o mesmo banco.



Testes de credenciais inválidas e expiração de token.



Recuperação de operações após falha do worker.



Auditoria completa das operações.



Não basta testar a emissão. O ciclo completo de cobrança precisa funcionar.



11\. Decisões técnicas que eu fecharia antes de começar

Há alguns pontos que merecem uma definição explícita:



Assunto



Minha recomendação



Arquitetura



Monólito modular



Execução



API e worker separados



Banco de dados



PostgreSQL



ORM



Drizzle



Filas



BullMQ + Redis



Padrão de integração



Adapter + Registry



Arquivos



Storage privado



CNAB



Layouts versionados por banco



Segurança



AES-256-GCM + KMS



Conciliação



Eventos idempotentes



Boleto PDF



Gerar após confirmação do registro



Multiempresa



Isolamento obrigatório por tenant



Uma observação adicional: não faria um gerador CNAB único com centenas de condições por banco. Criaria um núcleo de leitura e escrita de campos posicionais, mas cada banco teria seu próprio layout versionado. O padrão de 240 posições não significa que todos os bancos possuem exatamente as mesmas regras.



Para BB, por exemplo, há especificações próprias de cobrança e layouts distintos; o Sicredi publica documentação específica para 240 e 400; e o Sicoob também disponibiliza procedimentos próprios de transmissão e retorno. 



Portal BB

+3



12\. Minha recomendação: por onde começar

Eu não começaria implementando os três bancos simultaneamente.



Começaria pela Etapa 1 — Fundação, com estes entregáveis:



Migrations Drizzle de todas as entidades bancárias.



Cadastro multiempresa de contas e convênios.



Serviço de criptografia de credenciais.



Interfaces BankProvider e CnabProvider.



Provider Registry.



Sistema de filas e processamento assíncrono.



Endpoints de configuração bancária.



Testes automatizados de isolamento entre empresas.



Depois implementaria o Banco do Brasil como primeiro provider, validando toda a arquitetura antes de replicá-la.



Uma decisão importante: o módulo deve ser independente do financeiro, mas integrado a ele por contratos bem definidos. Assim, no futuro, o mesmo Banking Gateway poderá ser utilizado pelo Mais Gestão, por outros produtos da Compumais ou até por integrações externas.

