# Estação Balança (Flutter)

App Windows + Android para lançar consumo em **kg** em comandas via PDV local (LAN), com balança **Toledo Prix Prt3**.

## Fluxo

### Configuração
1. Informa URL/IP do PDV (`http://IP:5050` ou QR `mgpos://…`)
2. Login (mesmo usuário da retaguarda)
3. **Atalhos:** lista só produtos com unidade **KG** do catálogo do PDV e marca os que entram na grade

### Operação (touch + leitor)
1. Tela simples: *“Passe a comanda no leitor”* (sem digitar)
2. Grade de atalhos em **cards com imagem** → toque no produto
3. Coloca na balança → lê peso → mostra **kg + total (R$)**
4. **Confirmar** → `POST /pos/contas/{id}/itens` → volta para a próxima comanda

## Pré-requisitos

- Flutter 3.5+
- PDV principal com LAN (`lan_habilitada=1`, porta `5050`) e módulo Gourmet
- Prix: `C14=Prt3`, `C15=2400`, 8N1

## Executar

```bash
cd api-mais-gestao/estacao-balanca
flutter pub get
# Windows
./run_windows.ps1
# ou
flutter run -d windows --no-enable-impeller
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
