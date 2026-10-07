# Resoluções complexas

Documentação de problemas complexos resolvidos no projeto, para consulta e onboarding.

## Resoluções

_(Novas entradas são adicionadas no topo desta seção.)_

### Web em produção mostra versão antiga após o deploy (cache de proxy do Nginx/aaPanel)

- **Contexto**: Depois de `build:live`/`up.sh` (build com sucesso, `/versao` já com o id novo), as telas continuavam antigas. A alteração aparecia só ao entrar em rotas ainda não visitadas, sumia ao fechar e reabrir o navegador e "voltava" depois de semanas. No console aparecia `The resource .../_next/static/chunks/<hash>.css was preloaded using link preload but not used`, e esse CSS dava 404 no Next. Também causou, em NF-e de venda, o erro "informe ao menos um item" ao emitir (o navegador rodava um JS antigo, sem a correção dos itens), que sumia com F5.
- **Causa / Motivo**: O Nginx que atende o domínio é o do **aaPanel** (`/www/server/nginx`, config em `/www/server/panel/vhost/nginx/`), não o de `/etc/nginx`. O arquivo global `/www/server/nginx/conf/proxy.conf` tem `proxy_cache cache_one;`, que vale para todos os sites. O Next entrega páginas pré-renderizadas e payloads RSC (`?_rsc=`) com `Cache-Control: s-maxage=31536000` (1 ano); o Nginx respeitava isso e guardava em `/www/server/nginx/proxy_cache_dir`. A chave de cache é a URL, e as URLs `?_rsc=` se repetem entre deploys, então a navegação interna recebia payloads de builds antigos. Na investigação, 884 de 1.410 entradas HTML/RSC apontavam para chunks inexistentes no build atual (596 citavam o CSS do aviso do console). O `X-Cache: HIT` aparecia em chunks que o Next já não tinha.
- **Solução**:
  1. No vhost do web, `/www/server/panel/vhost/nginx/proxy/maisgestao.compumais.com/*.conf`, adicionar `proxy_cache off;` logo abaixo do `proxy_pass http://127.0.0.1:3000;` (fazer backup antes).
  2. Validar e recarregar: `/www/server/nginx/sbin/nginx -t -c /www/server/nginx/conf/nginx.conf` e `/www/server/nginx/sbin/nginx -s reload -c /www/server/nginx/conf/nginx.conf`.
  3. Limpar só as entradas do web em `/www/server/nginx/proxy_cache_dir` (arquivos cujo `KEY:` começa com `http://127.0.0.1:3000`), preservando as da API.
  4. Cada navegador precisa de um `Ctrl+Shift+R` uma vez para descartar o que já guardou.
  5. Se o aaPanel regravar esse arquivo (edição do proxy pela interface), conferir se o `proxy_cache off;` continua lá.
- **Referências**:
  - Diagnóstico: o access log real está em `/www/wwwlogs/maisgestao.compumais.com.log`. Para provar cache, pedir um chunk antigo com `Accept-Encoding: gzip` e procurar `x-cache: HIT` com `Last-Modified` antigo, enquanto `curl http://127.0.0.1:3000/_next/static/chunks/<arquivo>` dá 404.
  - Neste servidor só há Node 20.18.2 e o `pnpm` 11.22 (campo `packageManager`) exige Node ≥ 22.13. Para publicar, rodar `PATH=<dir com atalho pnpm→npm>:$PATH node scripts/zero-downtime-build.js` dentro de `web/`, ou usar um Node mais novo.
- **Data**: 2026-10-06.
