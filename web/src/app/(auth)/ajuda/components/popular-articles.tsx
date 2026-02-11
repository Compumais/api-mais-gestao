import { IconArrowRight, IconClock } from "@tabler/icons-react";
import Link from "next/link";

const popularArticles = [
    {
        id: "1",
        title: "Como criar minha primeira conta a pagar?",
        category: "Contas a Pagar",
        readTime: "3 min",
        href: "/ajuda/artigo/criar-conta-pagar",
    },
    {
        id: "2",
        title: "Como cadastrar uma conta bancária?",
        category: "Bancos e Contas",
        readTime: "2 min",
        href: "/ajuda/artigo/cadastrar-conta-bancaria",
    },
    {
        id: "3",
        title: "Entendendo o plano de contas",
        category: "Plano de Contas",
        readTime: "5 min",
        href: "/ajuda/artigo/entendendo-plano-contas",
    },
    {
        id: "4",
        title: "Como gerar relatórios de fluxo de caixa?",
        category: "Relatórios",
        readTime: "4 min",
        href: "/ajuda/artigo/relatorio-fluxo-caixa",
    },
    {
        id: "5",
        title: "Conciliação bancária: passo a passo",
        category: "Movimentações",
        readTime: "6 min",
        href: "/ajuda/artigo/conciliacao-bancaria",
    },
    {
        id: "6",
        title: "Como adicionar novos usuários?",
        category: "Usuários e Permissões",
        readTime: "3 min",
        href: "/ajuda/artigo/adicionar-usuarios",
    },
];

export function PopularArticles() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularArticles.map((article) => (
                <Link
                    key={article.id}
                    href={article.href}
                    className="group rounded-lg border bg-card p-5 transition-all hover:border-primary hover:shadow-md"
                >
                    <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            {article.category}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <IconClock className="size-3.5" />
                            {article.readTime}
                        </div>
                    </div>
                    <h3 className="mb-2 font-medium leading-snug text-card-foreground group-hover:text-primary">
                        {article.title}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        Ler artigo
                        <IconArrowRight className="size-4" />
                    </div>
                </Link>
            ))}
        </div>
    );
}
