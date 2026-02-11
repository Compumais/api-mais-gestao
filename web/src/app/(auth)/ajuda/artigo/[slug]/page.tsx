import {
    IconArrowLeft,
    IconArrowRight,
    IconClock,
    IconThumbDown,
    IconThumbUp,
} from "@tabler/icons-react";
import { Metadata } from "next";
import Link from "next/link";

interface ArticlePageProps {
    params: {
        slug: string;
    };
}

export const metadata: Metadata = {
    title: "Artigo de Ajuda | Mais Gestão",
    description: "Encontre respostas detalhadas para suas dúvidas",
};

export default function ArticlePage({ params }: ArticlePageProps) {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/ajuda" className="hover:text-foreground">
                    Central de Ajuda
                </Link>
                <IconArrowRight className="size-4" />
                <Link href="/ajuda/categoria/contas-pagar" className="hover:text-foreground">
                    Contas a Pagar
                </Link>
                <IconArrowRight className="size-4" />
                <span className="text-foreground">Como criar uma conta a pagar</span>
            </nav>

            {/* Article Header */}
            <article className="mb-12">
                <div className="mb-6 flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <IconClock className="size-4" />
                        <span>3 min de leitura</span>
                    </div>
                    <span>•</span>
                    <span>Atualizado em 10 de fevereiro de 2026</span>
                </div>

                <h1 className="mb-8 text-4xl font-bold">
                    Como criar uma conta a pagar
                </h1>

                {/* Article Content */}
                <div className="prose prose-slate max-w-none dark:prose-invert">
                    <p className="lead">
                        Neste guia, você aprenderá como cadastrar uma nova conta a pagar
                        no Mais Gestão de forma rápida e simples.
                    </p>

                    <h2>1. Acessando o módulo de Contas a Pagar</h2>
                    <p>
                        Para começar, acesse o menu lateral e clique em{" "}
                        <strong>Contas a Pagar</strong>. Você será direcionado para a
                        lista de contas cadastradas.
                    </p>

                    <h2>2. Criando uma nova conta</h2>
                    <p>
                        No canto superior direito da tela, clique no botão{" "}
                        <strong>Nova Conta a Pagar</strong>. Um formulário será exibido
                        com os seguintes campos:
                    </p>

                    <ul>
                        <li>
                            <strong>Fornecedor:</strong> Selecione o fornecedor da lista ou
                            cadastre um novo
                        </li>
                        <li>
                            <strong>Descrição:</strong> Informe uma descrição clara da
                            despesa
                        </li>
                        <li>
                            <strong>Valor:</strong> Digite o valor total da conta
                        </li>
                        <li>
                            <strong>Data de Vencimento:</strong> Selecione a data de
                            vencimento
                        </li>
                        <li>
                            <strong>Plano de Contas:</strong> Categorize a despesa no plano
                            de contas
                        </li>
                    </ul>

                    <h2>3. Informações adicionais (opcional)</h2>
                    <p>
                        Você também pode preencher campos opcionais como número do
                        documento, observações e anexar arquivos relacionados à conta.
                    </p>

                    <h2>4. Salvando a conta</h2>
                    <p>
                        Após preencher todos os campos necessários, clique em{" "}
                        <strong>Salvar</strong>. A conta será adicionada à lista e você
                        poderá acompanhar seu status.
                    </p>

                    <div className="not-prose my-8 rounded-lg border-l-4 border-primary bg-primary/5 p-4">
                        <p className="mb-0 text-sm">
                            <strong>💡 Dica:</strong> Você pode criar contas recorrentes
                            para despesas que se repetem mensalmente, como aluguel e
                            contas de serviços.
                        </p>
                    </div>

                    <h2>Próximos passos</h2>
                    <p>
                        Agora que você criou sua primeira conta a pagar, aprenda como:
                    </p>
                    <ul>
                        <li>Gerenciar vencimentos e receber notificações</li>
                        <li>Baixar contas pagas e registrar pagamentos</li>
                        <li>Gerar relatórios de contas a pagar</li>
                    </ul>
                </div>
            </article>

            {/* Feedback Section */}
            <div className="mb-12 rounded-lg border bg-card p-6">
                <h3 className="mb-4 text-center font-semibold">
                    Este artigo foi útil?
                </h3>
                <div className="flex justify-center gap-4">
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border bg-background px-6 py-3 transition-colors hover:bg-accent"
                    >
                        <IconThumbUp className="size-5" />
                        Sim
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border bg-background px-6 py-3 transition-colors hover:bg-accent"
                    >
                        <IconThumbDown className="size-5" />
                        Não
                    </button>
                </div>
            </div>

            {/* Related Articles */}
            <div className="mb-12">
                <h3 className="mb-6 text-xl font-semibold">Artigos relacionados</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Link
                        href="/ajuda/artigo/gerenciar-vencimentos"
                        className="group rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-md"
                    >
                        <h4 className="mb-2 font-medium group-hover:text-primary">
                            Gerenciando vencimentos
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            Como acompanhar e organizar datas de pagamento
                        </p>
                    </Link>
                    <Link
                        href="/ajuda/artigo/baixar-contas"
                        className="group rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-md"
                    >
                        <h4 className="mb-2 font-medium group-hover:text-primary">
                            Baixando contas pagas
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            Como registrar o pagamento de uma conta
                        </p>
                    </Link>
                </div>
            </div>

            {/* Back Link */}
            <div>
                <Link
                    href="/ajuda"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                    <IconArrowLeft className="size-4" />
                    Voltar para Central de Ajuda
                </Link>
            </div>
        </div>
    );
}
