# Configurações, usuários e sistema

## Propósito

Parâmetros da empresa (fiscal, série, impressão, integração), preferência visual do usuário, usuários do ERP, auditoria, e-mail, tarefas agendadas e certificado. Várias abas são a base da emissão e do PDV. Não duplicar aqui a regra que a API já aplica ao usar esses parâmetros.

## Rotas

- `/configuracoes` — abas por `?tab=` (default confirmado: `notificacoes`)
- `/configuracoes/modelos-impressao/novo` e `/configuracoes/modelos-impressao/[id]`
- `/configuracoes/modelos-impressao-pedido/novo` e `.../modelos-impressao-pedido/[id]`
- `/usuarios`, `/usuarios/novo`, `/usuarios/[id]/editar`
- `/auditoria`
- `/agendamentos`
- `/envio-emails`
- `/certificados-digitais`
- `/minha-conta`
- `/empresas/nova` — alta da empresa ([acesso.md](acesso.md))
- `/editor-sql` — está no menu e em `search-pages.ts`. **Não há** `page.tsx` em `src/app`. Rota de tela: não confirmada.

Valores de `tab` confirmados em `configuracoes/page.tsx`:

`tema`, `notificacoes`, `empresa-fiscal`, `nfe`, `nfce`, `nfse`, `ordem-servico`, `modelos-impressao`, `integracao`, `integracoes-contabeis`, `relatorios`, `impressao`, `pdv`

O menu aponta explicitamente para `?tab=integracoes-contabeis` e a busca para `?tab=pdv`. O estado inicial lê `searchParams` uma vez (`useState(tabInicial)`). Trocar a query depois de montar **não** está ligado a um `useEffect`: deep link só vale na entrada.

## Services / hooks

- `src/services/configuracao.service.ts` — hook `use-configuracao.ts`
- `src/services/configuracao-usuario.service.ts` — `["preferencias-ui-usuario"]` (menu e colunas de várias listas)
- `src/services/empresa-fiscal.service.ts`
- `src/services/nfe-configuracao.service.ts`, `nfce-configuracao.service.ts`, `nfse-configuracao.service.ts`
- `src/services/terminal-pdv.service.ts` — `["terminais-pdv"]`, `["nfce-series"]`
- `src/services/usuarios.service.ts`, `src/services/auditoria.service.ts`, `src/services/email.service.ts`, `src/services/automacao.service.ts` (agendamentos), `src/services/notificacoes.service.ts`
- `src/services/dominio.service.ts` na aba contábil
- `src/services/pdv-updates.service.ts` na seção de download do PDV
- Schemas: `configuracao.schema.ts`, `configuracao-usuario.schema.ts`, `empresa-fiscal-config.schema.ts`, `nfe-configuracao.schema.ts`, `nfce-configuracao.schema.ts`, `nfse-configuracao.schema.ts`, `email-smtp.schema.ts`, `automacao.schema.ts`, `usuarios.schema.ts`, `perfil.schema.ts`, `terminal-pdv.schema.ts`, `modelo-impressao-os.schema.ts`, `modelo-impressao-pedido.schema.ts`, `dominio.schema.ts`

Séries NF-e: componente `nfe-series-section.tsx` usa `queryKey` por ambiente (`[queryKey, idempresa, ambiente]`).

## Estado compartilhado

- Quase toda aba operacional exige `localStorageEmpresa`. Sem empresa a página mostra “Selecione uma empresa…”.
- Salvar terminais invalida `["terminais-pdv"]` e `["nfce-series"]`. O PDV e a NFC-e leem série/ambiente a partir daí (`["nfce-config-pdv"]` é outra chave: invalidar só a série pode deixar o caixa com ambiente velho até refetch).
- `TABELA_*` em `use-preferencias-ui-usuario.ts` é uma preferência só. Apagar a constante quebra a grade que a referencia (clientes, produtos, notas, OS, financeiro, auditoria).
- Tema (`TemaForm` + `next-themes`) é visual. Não guarda dado fiscal.

## Permissões / guards

- `/usuarios`: perfis `proprietario` e `admin` (guard e menu).
- `/configuracoes`: sem restrição de perfil na regra de rota. O perfil de menu restrito vê o item. Abas internas **não** têm guard próprio confirmado: quem abre `/configuracoes?tab=nfe` cai na aba se a página montar com essa query.
- Itens de menu “Configurações gerais”, agendamentos, auditoria, editor SQL e certificados: `PERFIS_ADMIN` no menu. Guard de rota para `/auditoria`, `/agendamentos`, `/envio-emails`, `/certificados-digitais`: **não confirmado**.

## O que não remover

- Abas `empresa-fiscal`, `nfe`, `nfce`, `nfse` e os schemas. Emissão, PDV e NFS-e param de funcionar na prática se a série/ambiente sumir da UI (a API pode até guardar o dado; o usuário não edita).
- Aba `ordem-servico` e modelos de impressão.
- Aba `integracoes-contabeis` com o valor exato da query (o menu não abre a aba por clique interno se o nome mudar).
- Zod de usuário/perfil. Limite de usuários do plano (`maxusuarios` em `useEntitlements`) — o bloqueio de criar usuário além do limite na UI: não confirmado neste arquivo; o limite de **empresas** está no `CompanyToogle`.
- Certificado: não persistir senha ou PFX no storage do browser.

## Regressões típicas

- Resetar a aba para `notificacoes` e ignorar `?tab=`.
- Tratar preferência de coluna como dado de negócio e “limpar” o service de configuração do usuário.
- Duplicar formulário fiscal da empresa dentro da tela de NF. A fonte de edição é esta página.
- Criar `page.tsx` de `/editor-sql` sem olhar o menu: o atalho já existe e hoje não tem página.
