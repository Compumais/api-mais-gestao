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
} from "@tabler/icons-react";
import Link from "next/link";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const reports = [
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
    {
        title: "DRE Gerencial",
        description: "Demonstração do Resultado do Exercício detalhado.",
        icon: IconFileAnalytics,
        href: "#",
        color: "text-purple-500",
    },
    {
        title: "Despesas por Categoria",
        description: "Análise gráfica das despesas categorizadas.",
        icon: IconChartPie,
        href: "#",
        color: "text-orange-500",
    },
    {
        title: "Receita por Categoria",
        description: "Análise gráfica das receitas categorizadas.",
        icon: IconChartDonut, // Alternativa visual para diferenciar
        href: "#",
        color: "text-emerald-500",
    },
    {
        title: "Inadimplência",
        description: "Controle de clientes inadimplentes e atrasos.",
        icon: IconAlertTriangle,
        href: "#",
        color: "text-rose-500",
    },
    {
        title: "Centro de Custos",
        description: "Relatórios segregados por centros de custo.",
        icon: IconBuildingBank,
        href: "#",
        color: "text-indigo-500",
    },
    {
        title: "Formas de Pagamento",
        description: "Análise de lucratividade por forma de pagamento.",
        icon: IconCreditCard,
        href: "#",
        color: "text-cyan-500",
    },
];

export default function RelatoriosPage() {
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
                {reports.map((report) => (
                    <Link href={report.href} key={report.title} className="group">
                        <Card className="h-full transition-all duration-200 hover:border-primary hover:shadow-md">
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors ${report.color}`}>
                                        <report.icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                            {report.title}
                                        </CardTitle>
                                    </div>
                                </div>
                                <CardDescription className="mt-2 pt-2">
                                    {report.description}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
