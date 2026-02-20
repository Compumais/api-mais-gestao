"use client";

import { usePlano } from "@/hooks/use-plano";
import {
    IconAlertTriangle,
    IconBuildingBank,
    IconCashBanknoteMinus,
    IconCashBanknotePlus,
    IconChartLine,
    IconChartPie,
    IconChartDonut,
    IconCreditCard,
    IconFileAnalytics,
    IconLock,
} from "@tabler/icons-react";
import Link from "next/link";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ... (reports array remains)

// Add a property to identify premium reports
const reports = [
    // ...
    {
        title: "DRE Gerencial",
        description: "Demonstração do Resultado do Exercício detalhado.",
        icon: IconFileAnalytics,
        href: "#",
        color: "text-purple-500",
        premium: true,
    },
    {
        title: "Despesas por Categoria",
        description: "Análise gráfica das despesas categorizadas.",
        icon: IconChartPie,
        href: "#",
        color: "text-orange-500",
        premium: true,
    },
    {
        title: "Receita por Categoria",
        description: "Análise gráfica das receitas categorizadas.",
        icon: IconChartDonut,
        href: "#",
        color: "text-emerald-500",
        premium: true,
    },
    {
        title: "Inadimplência",
        description: "Controle de clientes inadimplentes e atrasos.",
        icon: IconAlertTriangle,
        href: "#",
        color: "text-rose-500",
        premium: true,
    },
    {
        title: "Centro de Custos",
        description: "Relatórios segregados por centros de custo.",
        icon: IconBuildingBank,
        href: "#",
        color: "text-indigo-500",
        premium: true,
    },
    {
        title: "Formas de Pagamento",
        description: "Análise de lucratividade por forma de pagamento.",
        icon: IconCreditCard,
        href: "#",
        color: "text-cyan-500",
        premium: true,
    },
    // ... other reports (Fluxo de Caixa, Contas a Pagar, Contas a Receber) are free/basic
    {
        title: "Fluxo de Caixa",
        description: "Acompanhe as entradas e saídas de recursos financeiros.",
        icon: IconChartLine,
        href: "#",
        color: "text-blue-500",
    },
    {
        title: "Contas a Pagar",
        description: "Visualize suas obrigações financeiras futuras e pendentes.",
        icon: IconCashBanknoteMinus,
        href: "#",
        color: "text-red-500",
    },
    {
        title: "Contas a Receber",
        description: "Monitore os valores a receber de clientes e vendas.",
        icon: IconCashBanknotePlus,
        href: "#",
        color: "text-green-500",
    },
];

export default function RelatoriosPage() {
    const { isBasic, isLoading } = usePlano();

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
                <p className="text-muted-foreground">
                    Selecione um relatório para visualizar análises detalhadas.
                </p>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {reports.sort((a, b) => (a.premium === b.premium) ? 0 : a.premium ? 1 : -1).map((report) => {
                    const isLocked = isBasic && report.premium;

                    const CardContent = (
                        <Card className={`h-full transition-all duration-200 ${isLocked ? 'opacity-80 border-dashed bg-muted/50' : 'hover:border-primary hover:shadow-md'}`}>
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg bg-muted ${!isLocked && 'group-hover:bg-primary/10'} transition-colors ${report.color}`}>
                                        <report.icon className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className={`text-lg ${!isLocked && 'group-hover:text-primary'} transition-colors`}>
                                                {report.title}
                                            </CardTitle>
                                            {isLocked && <IconLock className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                    </div>
                                </div>
                                <CardDescription className="mt-2 pt-2">
                                    {report.description}
                                </CardDescription>
                                {isLocked && (
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <IconLock className="h-3 w-3" />
                                            Disponível no plano Premium
                                        </p>
                                    </div>
                                )}
                            </CardHeader>
                        </Card>
                    );

                    if (isLocked) {
                        return (
                            <div key={report.title} className="relative group cursor-not-allowed">
                                {CardContent}
                            </div>
                        );
                    }

                    return (
                        <Link href={report.href} key={report.title} className="group">
                            {CardContent}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
