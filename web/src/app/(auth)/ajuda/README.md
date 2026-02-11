# Central de Ajuda - Mais Gestão

Estrutura de páginas de ajuda inspirada no Google Chrome Support.

## 📁 Estrutura de Arquivos

```
ajuda/
├── page.tsx                          # Página principal da central de ajuda
├── components/
│   ├── help-search.tsx              # Componente de busca
│   ├── help-categories.tsx          # Grid de categorias
│   └── popular-articles.tsx         # Artigos populares
├── categoria/
│   └── [slug]/
│       └── page.tsx                 # Página de categoria dinâmica
└── artigo/
    └── [slug]/
        └── page.tsx                 # Página de artigo dinâmica
```

## 🎨 Design e Componentes

### Página Principal (`/ajuda`)
- **Hero Section**: Título, descrição e campo de busca
- **Categorias**: Grid responsivo com 8 categorias principais
- **Artigos Populares**: Grid com os 6 artigos mais acessados
- **Contato**: Botões para e-mail e abertura de chamado

### Página de Categoria (`/ajuda/categoria/[slug]`)
- **Breadcrumb**: Navegação hierárquica
- **Header**: Título e descrição da categoria
- **Lista de Artigos**: Cards clicáveis com título, descrição e tempo de leitura
- **Link de Retorno**: Volta para a página principal

### Página de Artigo (`/ajuda/artigo/[slug]`)
- **Breadcrumb**: Navegação completa
- **Metadata**: Tempo de leitura e data de atualização
- **Conteúdo**: Artigo formatado com tipografia responsiva
- **Feedback**: Botões de "útil" ou "não útil"
- **Artigos Relacionados**: Sugestões de leitura
- **Link de Retorno**: Volta para a página principal

## 🎯 Categorias Disponíveis

1. **Primeiros Passos** - Configuração inicial
2. **Contas a Pagar** - Gestão de despesas
3. **Contas a Receber** - Controle de receitas
4. **Bancos e Contas** - Gestão bancária
5. **Movimentações** - Fluxo de caixa
6. **Plano de Contas** - Organização financeira
7. **Relatórios** - Análises e relatórios
8. **Usuários e Permissões** - Controle de acesso

## 🚀 Próximos Passos

### Funcionalidades a Implementar

1. **Sistema de Busca**
   - Implementar busca full-text nos artigos
   - Sugestões de busca em tempo real
   - Histórico de buscas

2. **Sistema de Feedback**
   - Salvar avaliações de artigos
   - Comentários e sugestões
   - Métricas de utilidade

3. **Conteúdo Dinâmico**
   - Integrar com CMS ou banco de dados
   - Sistema de versionamento de artigos
   - Suporte a múltiplos idiomas

4. **Recursos Adicionais**
   - Vídeos tutoriais
   - GIFs animados
   - Downloads de materiais
   - FAQ interativo

5. **Personalização**
   - Artigos recomendados baseados no uso
   - Histórico de leitura
   - Favoritos

## 📝 Como Adicionar Novo Conteúdo

### Adicionar Nova Categoria

1. Edite `components/help-categories.tsx`
2. Adicione um novo objeto no array `categories`
3. Crie a estrutura de dados em `categoria/[slug]/page.tsx`

### Adicionar Novo Artigo

1. Edite a categoria correspondente em `categoria/[slug]/page.tsx`
2. Adicione o artigo no array `articles`
3. Crie o conteúdo em `artigo/[slug]/page.tsx`

### Adicionar Artigo Popular

1. Edite `components/popular-articles.tsx`
2. Adicione um novo objeto no array `popularArticles`

## 🎨 Personalização Visual

O design segue o tema do shadcn/ui e utiliza:
- **Cores**: Variáveis CSS do tema (primary, muted, etc.)
- **Ícones**: @tabler/icons-react
- **Tipografia**: Sistema de classes do Tailwind
- **Responsividade**: Grid system mobile-first

## 📱 Responsividade

- **Mobile**: 1 coluna
- **Tablet (sm)**: 2 colunas
- **Desktop (lg)**: 3 colunas
- **Large Desktop (xl)**: 4 colunas

## ♿ Acessibilidade

- Navegação por teclado
- Textos alternativos
- Contraste adequado
- Estrutura semântica HTML5
- ARIA labels onde necessário
