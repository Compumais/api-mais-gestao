# Estação Balança (Flutter)

App Windows + Android para lançar consumo em **kg** em comandas via PDV local (LAN), com balança **Toledo Prix Prt3**.

## Fluxo

### Configuração
1. Informa URL/IP do PDV (`http://IP:5050` ou QR `mgpos://…`)
2. Login (mesmo usuário da retaguarda)
3. **Atalhos:** lista só produtos com unidade **KG** do catálogo do PDV e marca os que entram na grade
4. Opcional: **Ignorar dígito verificador** no leitor (remove o último dígito do código da comanda)
5. **Balança:** Windows usa porta COM (`flutter_libserialport`); Android usa **USB OTG** + conversor USB-Serial (`usb_serial`), como o POS

### Operação (touch + leitor)
1. Tela simples: *“Passe a comanda no leitor”* (sem digitar). O leitor HID (teclado) é lido direto das teclas, terminado em `Enter`; a tela mostra o código lido e o número da comanda aberto
2. Grade de atalhos em **cards com imagem** → toque no produto
   - **Outros produtos** lista todo o catálogo do PDV (como a lista de produtos do POS: imagem, nome, código e preço, com busca por nome/código/EAN)
3. Produto em KG: coloca na balança → lê peso → mostra **kg + total (R$)**. Produto em outra unidade (ex.: UN): pede a **quantidade** em vez de pesar
4. **Confirmar** → `POST /pos/contas/{id}/itens` → volta para a próxima comanda

### Histórico
Lista os últimos 200 lançamentos gravados no aparelho, com reimpressão. Filtros: **período** (Todos, Hoje, Ontem, 7 dias ou intervalo de datas), **comanda** (número exato) e **produto** (trecho do nome, sem acento). Mostra a quantidade de lançamentos e o total em R$ do que está filtrado.

## Pré-requisitos

- Flutter 3.5+
- PDV principal com LAN (`lan_habilitada=1`, porta `5050`) e módulo Gourmet
- Prix: `C14=Prt3`, `C15=2400`, 8N1
- **Android:** tablet/celular com USB OTG + conversor USB-Serial (FTDI, CH340, CP210x, PL2303…). Aceite a permissão USB na primeira conexão.

## Executar

```bash
cd api-mais-gestao/estacao-balanca
flutter pub get
# Windows
./run_windows.ps1
# ou
flutter run -d windows --no-enable-impeller
```

## APK (Android)

Por causa do acento em `mais gestão`, o build AOT falha nesse path. Use um caminho sem acento (cópia) ou o script:

```powershell
# a partir de api-mais-gestao/estacao-balanca
./build_apk.ps1
```

Saída: `build/apk/Estacao-Balanca-1.0.0.apk` (release, assinado com keystore debug).

Ou manualmente:

```powershell
# copiar para path sem acento, depois:
flutter build apk --release
```

## Contrato LAN

- `GET /pos/health`, `POST /pos/login`, `GET/POST empresas`
- `GET /pos/sync` — catálogo (filtra KG nos atalhos)
- `GET /pos/imagens/produtos/:id` — imagens dos cards
- `GET /pos/mesas/{n}/conta`, `POST /pos/mesas/{n}/abrir`
- `POST /pos/contas/{id}/itens`
- `GET /pos/balanca/peso` (fonte alternativa)

Atalhos da estação ficam **locais no app** (não alteram os atalhos do caixa PDV).

## Testes

```bash
flutter test
```
