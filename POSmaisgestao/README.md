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

### Balança Toledo Prix 3 Fit

Suporte a Prix 3 Fit configurada em **Prt3, 2400 baud, 8N1**, conectada ao
Android por cabo OTG e conversor USB-Serial compatível (CDC ACM, FTDI, PL2303
ou CH340/CH341).

1. Na balança, confirme `C14 = Prt3` e `C15 = 2400`.
2. Conecte o conversor USB-Serial ao cabo da balança e ao Android via OTG.
3. Abra **Configurações → Periféricos → Balança**.
4. Selecione o conversor, habilite a balança e autorize o acesso USB.
5. Use **Testar leitura de peso** com um peso estável.

Produtos cadastrados em KG usam a leitura automaticamente na venda rápida.
Com a integração desabilitada, desconectada ou cancelada, a digitação manual
continua disponível. O diagnóstico mostra VID/PID, driver, última leitura e,
quando habilitado, os bytes TX/RX; ele nunca inclui dados de venda ou pagamento.

Sem hardware, execute `./gradlew testDebugUnitTest`: os testes cobrem frames
Prt3 normais, zero, instável, negativo, sobrecarga, ruído e fragmentação.

O USB direto opcional da balança não é tratado como HID. Esta implementação
depende de um conversor USB-Serial reconhecido; use a tela de diagnóstico para
confirmar o chipset/VID/PID no primeiro teste físico.

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
