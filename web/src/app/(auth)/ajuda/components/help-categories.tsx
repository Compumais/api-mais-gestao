import {
    IconBuildingBank,
    IconChartBar,
    IconCreditCard,
    IconFileInvoice,
    IconReceipt,
    IconSettings,
    IconUsers,
    IconWallet,
} from "@tabler/icons-react";
import Link from "next/link";

const categories = [
    {
        id: "primeiros-passos",
        title: "Primeiros Passos",
        description: "Configure sua conta e comece a usar o sistema",
        icon: IconSettings,
        articleCount: 12,
        href: "/ajuda/categoria/primeiros-passos",
    },
    {
        id: "contas-pagar",
        title: "Contas a Pagar",
        description: "Gerencie suas despesas e pagamentos",
        icon: IconFileInvoice,
        articleCount: 18,
        href: "/ajuda/categoria/contas-pagar",
    },
    {
        id: "contas-receber",
        title: "Contas a Receber",
        description: "Controle suas receitas e recebimentos",
        icon: IconReceipt,
        articleCount: 15,
        href: "/ajuda/categoria/contas-receber",
    },
    {
        id: "bancos",
        title: "Bancos e Contas",
        description: "Cadastre e gerencie suas contas bancárias",
        icon: IconBuildingBank,
        articleCount: 10,
        href: "/ajuda/categoria/bancos",
    },
    {
        id: "movimentacoes",
        title: "Movimentações",
        description: "Acompanhe o fluxo de caixa e movimentações",
        icon: IconWallet,
        articleCount: 14,
        href: "/ajuda/categoria/movimentacoes",
    },
    {
        id: "plano-contas",
        title: "Plano de Contas",
        description: "Organize suas categorias financeiras",
        icon: IconCreditCard,
        articleCount: 8,
        href: "/ajuda/categoria/plano-contas",
    },
    {
        id: "relatorios",
        title: "Relatórios",
        description: "Gere e analise relatórios financeiros",
        icon: IconChartBar,
        articleCount: 16,
        href: "/ajuda/categoria/relatorios",
    },
    {
        id: "usuarios",
        title: "Usuários e Permissões",
        description: "Gerencie usuários e controle de acesso",
        icon: IconUsers,
        articleCount: 9,
        href: "/ajuda/categoria/usuarios",
    },
];

export function HelpCategories() {
    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => {
                const Icon = category.icon;
                return (
                    <Link
                        key={category.id}
                        href={category.href}
                        className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
                    >
                        <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
                            <Icon className="size-6 text-primary" />
                        </div>
                        <h3 className="mb-2 font-semibold text-card-foreground">
                            {category.title}
                        </h3>
                        <p className="mb-3 text-sm text-muted-foreground">
                            {category.description}
                        </p>
                        <span className="text-xs text-muted-foreground">
                            {category.articleCount} artigos
                        </span>
                    </Link>
                );
            })}
        </div>
    );
}
