# POS Mais Gestão (v2)

App Android para maquininha POS integrado ao ERP Mais Gestão.

**APK debug:** `app/build/outputs/apk/debug/app-debug.apk`

---

## Produto

| Área | Comportamento |
|------|----------------|
| Modo NFC-e | Em **Configurações do POS**: switch “Emitir NFC-e na venda” ligado → PDV + baixa + NFC-e |
| Modo DAV | Switch desligado → cria DAV com `extra1 = "POS"` para a retaguarda |
| Mesas | Grade 1..N; lançar itens no POS; pagamento em `/gourmet` |
| Atalhos | Sync `GET/PUT /atalhos-pdv` |
| Web | Menu **Pedidos da maquininha** (`/pedidos?origem=POS`) |

---

## App (`POSmaisgestao/`)

- Login Better Auth + seleção de empresa
- Hub: venda rápida (exige caixa) / mesas (sem gate de caixa)
- Venda: atalhos em grade + busca em lista com paginação
- Mesas: grade livre/ocupada, total na conta, qty +1/+2/+5
- Config: URL API, PDV, quantidade de mesas, **modo NFC-e vs DAV**

```bash
cd POSmaisgestao
./gradlew assembleDebug
```

---

## API

### Migration

```
api/drizzle/0061_atalho_pdv_emitirnfcepos.sql
```

- Tabela `atalhopdv`
- Coluna `nfceconfiguracao.emitirnfcepos` (legado; o modo de venda é configurado no app POS)

```bash
cd api && npm run db:migrate
```

### Endpoints

| Método | Rota | Função |
|--------|------|--------|
| `GET` | `/atalhos-pdv?idempresa=` | Lista atalhos |
| `PUT` | `/atalhos-pdv` | Body `{ idempresa, idsProdutos[] }` |
| `GET` | `/davs?origem=POS` | Filtra por `extra1` |

---

## Web

- PDV → **Pedidos da maquininha** → `/pedidos?origem=POS`
