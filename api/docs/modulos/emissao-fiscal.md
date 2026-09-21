# Emissão fiscal

## Propósito no produto

Parametrização e autorização de NF-e (modelo 55), NFC-e (modelo 65) e NFS-e, incluindo série, certificado, regras, CFOP e numeração. Depois da autorização, a nota de venda pode gerar financeiro, estoque e venda de dashboard.

## Pastas e entrypoints

Feature `notas_fiscais` (`requireFeature`) em NF-e e NFC-e. NFS-e exige módulo `nfse` e perfil `proprietario`, `admin` ou `financeiro`.

| Plugin | Prefixo |
| --- | --- |
| `src/controllers/http/nfe-emissao/rotas.ts` | `/nfe/sefaz/status`, `/nfe/homologacao/testar`, `/nfe/emissao` (rascunho, transmitir, cancelar, inutilizar, preview DANFE, tributos) |
| `src/controllers/http/nfce/rotas.ts` | `/nfce/*` (pendentes, contingência, retransmitir/cancelar/inutilizar venda, `POST /nfce/pdv/reconciliar` body até 10 MB) |
| `src/controllers/http/nfse-emissao/rotas.ts` | `/nfse/emissao` |
| `src/controllers/http/nfe-configuracao/rotas.ts` | `GET\|PUT /empresas/:id/nfe-configuracao` |
| `src/controllers/http/nfce-configuracao/rotas.ts` | `GET\|PUT /empresas/:id/nfce-configuracao` |
| `src/controllers/http/nfse-configuracao/rotas.ts` | `GET\|PUT /empresas/:id/nfse-configuracao` |
| `src/controllers/http/nfe-serie/rotas.ts` | `/nfe-series` |
| `src/controllers/http/nfse-serie/rotas.ts` | `/nfse-series` |
| `src/controllers/http/certificado-digital/rotas.ts` | `/certificados-digitais` (+ ativar) |
| `src/controllers/http/operacao-fiscal/rotas.ts` | `/operacoes-fiscais` |
| `src/controllers/http/regra-fiscal/rotas.ts` | `/regras-fiscais` |
| `src/controllers/http/parametrizacao-tributos/rotas.ts` | `/parametrizacao-tributos` |
| `src/controllers/http/cfop/rotas.ts` | `/cfops` |
| `src/controllers/http/cfop-depara/rotas.ts` | `/cfop-depara` |
| `src/controllers/http/cfop-padrao/rotas.ts` | `/cfops-padrao` |
| `src/controllers/http/cest/rotas.ts` | `/cests` |
| `src/controllers/http/ibpt/rotas.ts` | `POST /empresas/:id/ibpt/importar`, `GET .../ibpt/status` |
| `src/controllers/http/taxauf/rotas.ts` | `/taxas-uf` |
| `src/controllers/http/enquatramento-ipi/rotas.ts` | `/enquadramentos-ipi` |
| `src/controllers/http/servicos-nfse/rotas.ts` | `/servicos-nfse` |

Services: `src/service/nfe-emissao/`, `nfce-emissao/`, `nfse-emissao/`, `nfe-configuracao/`, `nfce-configuracao/`, `nfse-configuracao/`, `nfe-serie/`, `nfse-serie/`, `certificado-digital/`, `operacao-fiscal/`, `regra-fiscal/`, `parametrizacao-tributos/`, `cfop/`, `cfop-depara/`, `cfop-padrao/`, `cest/`, `ibpt/`, `taxauf/`, `enquatramento-ipi/`, `servicos-nfse/`, `src/service/fiscal/`.

Clientes: `src/lib/nfe-gateway-client.ts`, `src/lib/nfse-gateway-client.ts`, `src/lib/ibpt-client.ts`.

Integração pós-autorização: `src/service/nota-fiscal/integrar-nota-fiscal-venda-autorizada.ts` (financeiro, caixa, estoque, dashboard). Ambiente de homologação não integra operação real se `permiteIntegracaoOperacionalNota` bloquear (`src/util/ambiente-sefaz.ts`).

Status de nota: `src/util/nfe-status.ts`.

CFOPs, taxas e parametrização padrão nascem com a empresa. Scripts npm: `popular-cfops-padrao`, `popular-taxas-padrao`, `popular-parametrizacao-tributos-padrao`, `seed:cest`, `seed:servicos-nfse`, `auditar-numeracao-fiscal`.

## Contratos externos

- Web: emissão, cancelamento, inutilização, configuração.
- PDV: transmissão, contingência e `POST /nfce/pdv/reconciliar` (venda local versus nota). Também `retransmitir` / `inutilizar` / `cancelar` por id de venda.
- Gateway PHP (`api_Nfe/`): a API não assina XML sozinha; envia PFX e payload ao gateway.
- SEFAZ é alcançada só pelo gateway.
- POS Android: não confirmado.

## Configuração crítica

Não remover:

- `NFE_GATEWAY_URL`, `NFE_GATEWAY_SECRET`
- `NFSE_GATEWAY_URL` (default `http://127.0.0.1:8089`), `NFSE_GATEWAY_SECRET`
- `NFE_CERT_ENCRYPTION_KEY`
- `NFE_STORAGE_PATH`
- `IBPT_API_BASE_URL`, `IBPT_API_TIMEOUT_MS`

Certificado ativo é único por empresa no fluxo de ativação (`POST /certificados-digitais/:id/ativar`). Série controla numeração; inutilização grava faixa consumida. Não reutilizar número autorizado.

IBPT fica copiado no PostgreSQL (`ibpt-aliquota`). Emissão lê a cópia local, não a API por item (README e `src/lib/ibpt-client.ts`).

## Invariantes

- Emissão exige empresa, configuração fiscal, certificado e série. Homologação (`/nfe/homologacao/testar`) não é atalho de produção.
- Cancelar e inutilizar são eventos SEFAZ. Apagar a linha no banco não cancela na SEFAZ.
- XML assinado, autorizado, cancelado e inutilizado vai para disco (`src/util/xml-storage.ts`) e/ou `nota-fiscal-xml`.
- Reconciliação NFC-e do PDV compara hash; divergência retorna `NFCE_CONTINGENCIA_HASH_DIVERGENTE` (ver service de contingência).
- Regras fiscais e parametrização escolhem CST/CSOSN, CFOP e alíquotas. `src/service/fiscal/avaliar-emissao-fiscal-service.ts` e `resolver-regras-fiscais` não são opcionais na emissão.
- De-para de CFOP (`cfop-depara`) converte CFOP de entrada/saída. Não apagar achando que é só cadastro.
- Zod nos controllers de configuração NFC-e, emissão (há `emissao-nfe-body-schema.test.ts`) e schemas de NFC-e.

## O que quebra se alterar ou apagar

- Autorização, cancelamento, inutilização e contingência.
- Numeração (buraco ou duplicidade) se série ou inutilização for alterada.
- Financeiro e estoque deixam de nascer na venda autorizada se `integrarNotaFiscalVendaAutorizada` for removida ou se `gerarFinanceiro` / `gerarEstoque` mudarem de contrato.
- DAV e OS que chamam emissão (`faturar-nfe`, `faturar-nfce`, rascunho de NF-e da OS).
- SINTEGRA e EFD, que leem notas autorizadas.
- Certificados já gravados se a chave de criptografia mudar (não dá para ler o PFX antigo).

## Dependências de outros módulos da API

Empresas e empresa fiscal, produtos, entidades, estoque, financeiro, DAV, OS, PDV, obrigações fiscais, gateway externo.

## Testes relacionados

Há dezenas em `src/service/nfe-emissao/`, `src/service/nfce-emissao/` e `src/service/fiscal/`. Exemplos reais:

- `src/controllers/http/nfe-emissao/emissao-nfe-body-schema.test.ts`
- `src/service/nfce-emissao/retransmitir-nfce-venda-pdv.test.ts`
- `src/service/nfce-emissao/inutilizar-nfce-venda-pdv.test.ts`
- `src/service/nfce-emissao/reconciliar-nfce-pdv.test.ts`
- `src/service/nfce-emissao/transmitir-nfce-contingencia.test.ts`
- `src/service/nfe-emissao/calcular-tributos-aproximados-ibpt.test.ts`
- `src/service/fiscal/resolver-regras-fiscais.test.ts`
- `src/lib/nfe-gateway-client.test.ts`
- `src/lib/ibpt-client.test.ts`
- `src/service/nota-fiscal/registrar-venda-dashboard-nf-venda.test.ts`
