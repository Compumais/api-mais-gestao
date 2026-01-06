# Mais Gestão

## 📋 Sobre o Projeto

**Mais Gestão** é uma plataforma SaaS voltada para empresas realizarem controle financeiro completo. O sistema oferece funcionalidades essenciais para gestão financeira empresarial, incluindo:

- Gestão de empresas e usuários
- Controle de plano de contas
- Gestão financeira (contas a pagar e receber)
- Controle de clientes
- Contas correntes e lançamentos
- Autenticação e autorização de usuários
- Auditoria de ações

A solução foi desenvolvida para ser escalável, segura e fácil de usar, permitindo que empresas de todos os portes tenham controle total sobre suas finanças.

## 🛠️ Especificações Técnicas

### Tecnologias Utilizadas

- **Runtime**: Node.js
- **Linguagem**: TypeScript
- **Framework Web**: Fastify 5.6.2
- **ORM**: Drizzle ORM 0.44.7
- **Banco de Dados**: PostgreSQL 17
- **Autenticação**: Better Auth 1.4.4
- **Validação**: Zod 4.1.13
- **Containerização**: Docker & Docker Compose

### Dependências Principais

```json
{
  "@fastify/cors": "^11.1.0",
  "better-auth": "^1.4.4",
  "dotenv": "^17.2.3",
  "drizzle-orm": "^0.44.7",
  "fastify": "^5.6.2",
  "pg": "^8.16.3",
  "uuid": "^13.0.0",
  "zod": "^4.1.13"
}
```

### Dependências de Desenvolvimento

```json
{
  "@biomejs/biome": "2.3.8",
  "@types/pg": "^8.15.6",
  "drizzle-kit": "^0.31.7",
  "tsx": "^4.21.0",
  "typescript": "^5.9.3"
}
```

## 📁 Estrutura de Pastas

```
api-mais-gestao/
├── src/                          # Código-fonte da aplicação
│   ├── @types/                   # Definições de tipos TypeScript
│   │   └── fastify.d.ts
│   ├── controllers/              # Controladores (rotas e handlers)
│   │   ├── authentication.ts    # Rotas de autenticação
│   │   ├── empresas/            # Controladores de empresas
│   │   │   ├── criar.ts
│   │   │   ├── listar-empresas.ts
│   │   │   └── rotas.ts
│   │   ├── middleware/          # Middlewares
│   │   │   └── verify-jwt.ts
│   │   └── plano-contas/        # Controladores de plano de contas
│   │       ├── criar.ts
│   │       └── rotas.ts
│   ├── lib/                      # Bibliotecas e utilitários
│   │   └── auth.ts              # Configuração de autenticação
│   ├── model/                    # Modelos de dados
│   │   ├── empresa-model.ts
│   │   ├── http-model.ts
│   │   └── usuario-model.ts
│   ├── repositories/             # Camada de acesso a dados
│   │   ├── connection.ts        # Conexão com banco de dados
│   │   ├── empresa-model.ts
│   │   ├── plano-contas-model.ts
│   │   ├── usuarios-model.ts
│   │   └── schema/
│   │       └── index.ts
│   ├── service/                  # Lógica de negócio
│   │   ├── empresa/
│   │   │   ├── criar-empresa.ts
│   │   │   └── listar-empresas.ts
│   │   ├── planocontas/
│   │   │   └── criar-plano-contas.ts
│   │   └── usuarios/
│   │       └── buscar.ts
│   ├── util/                     # Utilitários
│   │   └── http-util.ts
│   └── index.ts                  # Ponto de entrada da aplicação
├── drizzle/                      # Migrações e schema do banco
│   ├── 0000_*.sql               # Arquivos de migração
│   ├── meta/                    # Metadados das migrações
│   ├── relations.ts             # Relações entre tabelas
│   └── schema.ts                # Schema do banco de dados
├── docker-compose.yml           # Configuração do Docker Compose
├── drizzle.config.ts            # Configuração do Drizzle ORM
├── tsconfig.json                # Configuração do TypeScript
├── biome.json                   # Configuração do Biome (linter/formatter)
├── package.json                 # Dependências e scripts
└── server.http                  # Arquivo para testes HTTP
```

### Arquitetura

O projeto segue uma arquitetura em camadas:

1. **Controllers**: Responsáveis por receber requisições HTTP e retornar respostas
2. **Services**: Contêm a lógica de negócio da aplicação
3. **Repositories**: Gerenciam o acesso e manipulação dos dados no banco
4. **Models**: Definem os tipos e estruturas de dados

## 🚀 Como Baixar e Instalar

### Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/)

### Passo a Passo

1. **Clone o repositório**

```bash
git clone <url-do-repositorio>
cd api-mais-gestao
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# URL de conexão com o banco de dados PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mais_gestao

# Configurações do Better Auth (ajuste conforme necessário)
BETTER_AUTH_SECRET=sua-chave-secreta-aqui
BETTER_AUTH_URL=http://localhost:3333
```

**Nota**: Para produção, use valores seguros e não compartilhe o arquivo `.env`.

4. **Inicie o banco de dados com Docker**

```bash
docker-compose up -d
```

Este comando irá:
- Criar e iniciar um container PostgreSQL 17
- Criar o banco de dados `mais_gestao`
- Expor a porta 5432 para conexões locais

5. **Execute as migrações do banco de dados**

```bash
npx drizzle-kit push
```

Ou, se preferir gerar e executar migrações:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

6. **Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3333`

### Verificando a Instalação

Para verificar se tudo está funcionando corretamente, acesse:

```
GET http://localhost:3333/health
```

Você deve receber uma resposta:

```json
{
  "status": "Ok"
}
```

## 📝 Scripts Disponíveis

- `npm run dev`: Inicia o servidor em modo de desenvolvimento com hot-reload
- `npm test`: Executa os testes (quando implementados)

## 🔧 Configurações Adicionais

### Porta do Servidor

Por padrão, o servidor roda na porta `3333`. Para alterar, modifique o arquivo `src/index.ts`:

```typescript
app.listen({ port: 3333 }) // Altere para a porta desejada
```

### CORS

O CORS está configurado para aceitar requisições de qualquer origem em desenvolvimento. Para produção, ajuste no arquivo `src/index.ts`:

```typescript
app.register(cors, {
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  // ...
});
```

## 📚 Endpoints Disponíveis

### Autenticação
- `POST /api/auth/*` - Rotas de autenticação do Better Auth

### Empresas
- `GET /empresas` - Lista todas as empresas
- `POST /empresas` - Cria uma nova empresa

### Plano de Contas
- `POST /plano-contas` - Cria um novo plano de contas

### Health Check
- `GET /health` - Verifica o status da API

## 🗄️ Banco de Dados

O projeto utiliza PostgreSQL com as seguintes tabelas principais:

- `usuarios` - Usuários do sistema
- `empresas` - Empresas cadastradas
- `usuario_empresas` - Relação entre usuários e empresas
- `planocontas` - Plano de contas contábil
- `financeiro` - Contas a pagar e receber
- `clientes` - Cadastro de clientes
- `contacorrente` - Contas correntes bancárias
- `contacorrentelancamento` - Lançamentos em contas correntes
- `sessoes` - Sessões de autenticação
- `audit_logs` - Logs de auditoria

## 🔐 Segurança

- Autenticação implementada com Better Auth
- Validação de dados com Zod
- Middleware de verificação JWT para rotas protegidas
- Logs de auditoria para rastreamento de ações

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC.

## 👥 Autores

- Equipe Mais Gestão

---

**Desenvolvido com ❤️ para facilitar a gestão financeira empresarial**

